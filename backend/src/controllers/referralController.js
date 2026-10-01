const { NotifType, ReferralStatus, Role } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const { createNotification } = require("../utils/notificationHelper");
const { getFrontendUrl } = require("../utils/publicUrl");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function serializeReferral(referral) {
  return {
    id: referral.id,
    referredEmail: referral.referredEmail,
    status: referral.status,
    createdAt: referral.createdAt,
    rewardCode: referral.rewardCode
      ? {
          code: referral.rewardCode.code,
          discountPct: referral.rewardCode.discountPct,
          expiresAt: referral.rewardCode.expiresAt
        }
      : null
  };
}

async function createReferral(req, res, next) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: "Ingresá un correo electrónico válido" });
    }
    if (email === req.user.email) {
      return res.status(400).json({ error: "No podés invitar tu propio correo" });
    }

    const registeredUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });
    if (registeredUser) {
      return res.status(409).json({ error: "Ese correo ya está registrado" });
    }

    const existing = await prisma.referral.findFirst({
      where: {
        referrerId: req.user.id,
        referredEmail: email,
        status: {
          in: [ReferralStatus.PENDING, ReferralStatus.REGISTERED]
        }
      },
      include: { rewardCode: true }
    });
    if (existing) {
      return res.status(409).json({ error: "Ya invitaste a este correo" });
    }

    const referral = await prisma.referral.create({
      data: {
        referrerId: req.user.id,
        referredEmail: email
      },
      include: { rewardCode: true }
    });

    const frontendUrl = getFrontendUrl();
    const registrationUrl = `${frontendUrl}/registro?ref=${req.user.id}`;
    await sendEmail({
      to: email,
      subject: `${req.user.name} te invita a Enyell`,
      html: renderEmailLayout({
        title: "Una invitación para impulsar tu negocio",
        contentHtml: `
          <p>Hola,</p>
          <p><strong>${escapeHtml(req.user.name)}</strong> te invitó a conocer Enyell.</p>
          <p>Enyell ofrece ilustraciones personalizadas, retratos, fanart, y más.</p>
          <p>
            <a href="${escapeHtml(registrationUrl)}" style="display:inline-block;padding:12px 18px;background:#8B5CF6;color:#111827;text-decoration:none;font-weight:700;border-radius:6px;">
              Crear mi cuenta
            </a>
          </p>
          <p>La recompensa se activa cuando se concreta la primera contratación.</p>
        `
      })
    });

    return res.status(201).json(serializeReferral(referral));
  } catch (error) {
    return next(error);
  }
}

async function listReferrals(req, res, next) {
  try {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        rewardCode: {
          select: {
            code: true,
            discountPct: true,
            expiresAt: true
          }
        }
      }
    });

    return res.json({ referrals: referrals.map(serializeReferral) });
  } catch (error) {
    return next(error);
  }
}

async function generateUniqueRewardCode(tx, referrerId) {
  const prefix = `REF-${referrerId}`;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `${prefix}-${suffix}`;
    const existing = await tx.discountCode.findUnique({
      where: { code },
      select: { id: true }
    });
    if (!existing) {
      return code;
    }
  }

  throw new Error("No se pudo generar un código de referido único");
}

async function confirmReferralIfExists(referredUserId) {
  const referredUser = await prisma.user.findUnique({
    where: { id: referredUserId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });

  if (!referredUser || referredUser.role !== Role.CLIENT) {
    return null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const referral = await tx.referral.findFirst({
      where: {
        status: ReferralStatus.REGISTERED,
        OR: [
          { referredId: referredUser.id },
          { referredEmail: referredUser.email }
        ]
      },
      orderBy: { createdAt: "asc" }
    });
    if (!referral) {
      return null;
    }

    const creator = await tx.user.findFirst({
      where: {
        role: Role.ADMIN,
        isActive: true
      },
      select: { id: true }
    });
    if (!creator) {
      throw new Error("No hay un administrador activo para crear la recompensa");
    }

    const rewardCode = await tx.discountCode.create({
      data: {
        code: await generateUniqueRewardCode(tx, referral.referrerId),
        discountPct: 10,
        maxUses: 1,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdById: creator.id
      }
    });

    const updatedReferral = await tx.referral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.REWARDED,
        referredId: referredUser.id,
        rewardCodeId: rewardCode.id
      },
      include: {
        referrer: {
          select: {
            id: true
          }
        }
      }
    });

    return {
      referral: updatedReferral,
      rewardCode
    };
  });

  if (!result) {
    return null;
  }

  await createNotification(result.referral.referrer.id, {
    title: "Recompensa por referido",
    body: `Recibiste el código ${result.rewardCode.code} por referir a ${referredUser.name}`,
    type: NotifType.STATUS_CHANGE,
    linkUrl: "/dashboard/profile",
    metadata: {
      referralId: result.referral.id,
      rewardCode: result.rewardCode.code
    }
  });

  return result;
}

module.exports = {
  createReferral,
  listReferrals,
  confirmReferralIfExists
};
