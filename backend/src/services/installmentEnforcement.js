const prisma = require("../lib/prisma");
const { createNotification } = require("../utils/notificationHelper");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");

const MOROSO_TAG = "moroso";
const PENALTY_RATE = 0.02;
const DISCOUNT_COOLDOWN_MONTHS = 6;

function formatCRC(centimos) {
  return `₡${(centimos / 100).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;
}

async function notifyAllAdmins({ title, body, type, linkUrl, metadata }) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true }
  });
  for (const admin of admins) {
    await createNotification(admin.id, { title, body, type, linkUrl, metadata });
  }
}

async function applyMorosoStatus(clientId) {
  const user = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, email: true, tags: true, morosoSince: true }
  });
  if (!user || user.morosoSince) return;

  const updatedTags = user.tags.includes(MOROSO_TAG) ? user.tags : [...user.tags, MOROSO_TAG];

  await prisma.user.update({
    where: { id: clientId },
    data: {
      morosoSince: new Date(),
      tags: updatedTags
    }
  });

  await prisma.clientDownload.updateMany({
    where: { clientId, status: "ACTIVE" },
    data: { status: "INACTIVE" }
  });

  await prisma.clientProduct.updateMany({
    where: { clientId, status: "ACTIVE" },
    data: { status: "PAUSED" }
  });

  const activeProducts = await prisma.clientProduct.findMany({
    where: { clientId, status: "PAUSED", renewalDate: { not: null } }
  });
  for (const cp of activeProducts) {
    const remainingDays = Math.max(0, Math.round((cp.renewalDate.getTime() - Date.now()) / 86400000));
    await prisma.clientProduct.update({
      where: { id: cp.id },
      data: {
        notes: cp.notes
          ? `${cp.notes}\n[moroso_frozen_days:${remainingDays}]`
          : `[moroso_frozen_days:${remainingDays}]`,
        renewalDate: null
      }
    });
  }

  await prisma.hourBooking.updateMany({
    where: {
      clientId,
      status: { in: ["PENDING_PAYMENT", "CONFIRMED"] }
    },
    data: { status: "CANCELLED" }
  });

  await createNotification(clientId, {
    title: "Cuenta restringida por mora",
    body: "Su cuenta ha sido restringida debido a cuotas vencidas. Realice los pagos pendientes para restaurar el acceso.",
    type: "STATUS_CHANGE",
    linkUrl: "/dashboard/cuotas"
  });

  await notifyAllAdmins({
    title: "Cliente en mora",
    body: `El cliente ${user.name} (${user.email}) ha sido marcado como moroso por cuotas vencidas.`,
    type: "STATUS_CHANGE",
    linkUrl: "/admin/cuotas"
  });

  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "Cuenta restringida por cuotas vencidas — Enyell",
      html: renderEmailLayout({
        title: "Cuenta restringida por mora",
        contentHtml: `
          <p>Hola ${user.name},</p>
          <p>Su cuenta ha sido restringida debido a cuotas de pago vencidas.</p>
          <p><strong>Mientras su cuenta esté restringida:</strong></p>
          <ul>
            <li>No podrá realizar nuevas compras</li>
            <li>No podrá descargar archivos ni actualizaciones</li>
            <li>Sus servicios activos estarán pausados</li>
            <li>Los códigos de descuento no estarán disponibles</li>
          </ul>
          <p>Para restaurar su acceso, realice los pagos pendientes desde su dashboard de cuotas.</p>
        `
      })
    });
  }
}

async function applyPenaltyFees() {
  const overdueInstallments = await prisma.installment.findMany({
    where: {
      status: "OVERDUE",
      penaltyFeeCRC: 0
    }
  });

  let applied = 0;
  for (const inst of overdueInstallments) {
    const penalty = Math.round(inst.amountCRC * PENALTY_RATE);
    if (penalty <= 0) continue;

    await prisma.installment.update({
      where: { id: inst.id },
      data: { penaltyFeeCRC: penalty }
    });
    applied++;
  }
  return applied;
}

async function liftMorosoIfCleared(clientId) {
  const activePlans = await prisma.installmentPlan.findMany({
    where: {
      clientId,
      status: { in: ["ACTIVE", "DEFAULTED"] }
    },
    include: { installments: true }
  });

  const hasOverdue = activePlans.some((plan) =>
    plan.installments.some((i) => i.status === "OVERDUE")
  );

  if (hasOverdue) return false;

  const user = await prisma.user.findUnique({
    where: { id: clientId },
    select: { tags: true, morosoSince: true }
  });
  if (!user || !user.morosoSince) return false;

  await prisma.user.update({
    where: { id: clientId },
    data: {
      morosoSince: null,
      morosoLiftedAt: new Date()
    }
  });

  const pausedProducts = await prisma.clientProduct.findMany({
    where: { clientId, status: "PAUSED" }
  });
  for (const cp of pausedProducts) {
    const match = cp.notes?.match(/\[moroso_frozen_days:(\d+)\]/);
    const frozenDays = match ? parseInt(match[1], 10) : 0;
    const newRenewalDate = frozenDays > 0
      ? new Date(Date.now() + frozenDays * 86400000)
      : null;
    const cleanedNotes = cp.notes
      ? cp.notes.replace(/\n?\[moroso_frozen_days:\d+\]/, "").trim() || null
      : null;
    await prisma.clientProduct.update({
      where: { id: cp.id },
      data: {
        status: "ACTIVE",
        renewalDate: newRenewalDate,
        notes: cleanedNotes
      }
    });
  }

  await prisma.clientDownload.updateMany({
    where: { clientId, status: "INACTIVE" },
    data: { status: "ACTIVE" }
  });

  await createNotification(clientId, {
    title: "Acceso restaurado",
    body: "Sus pagos están al día. Su cuenta y servicios han sido restaurados.",
    type: "STATUS_CHANGE",
    linkUrl: "/dashboard/cuotas"
  });

  return true;
}

async function removeMorosoTagAfterCooldown() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - DISCOUNT_COOLDOWN_MONTHS);

  const users = await prisma.user.findMany({
    where: {
      morosoLiftedAt: { lte: cutoff },
      tags: { has: MOROSO_TAG }
    },
    select: { id: true, tags: true }
  });

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        tags: user.tags.filter((t) => t !== MOROSO_TAG)
      }
    });
  }

  return users.length;
}

module.exports = {
  MOROSO_TAG,
  applyMorosoStatus,
  applyPenaltyFees,
  liftMorosoIfCleared,
  removeMorosoTagAfterCooldown,
  notifyAllAdmins
};
