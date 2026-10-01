const {
  InstallmentPlanStatus,
  InstallmentStatus,
  NotifType,
  Role
} = require("@prisma/client");
const prisma = require("../lib/prisma");
const { createNotification } = require("../utils/notificationHelper");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const { createOneTimeCheckoutSession } = require("../utils/onvoClient");
const { buildFrontendUrl } = require("../utils/publicUrl");
const { liftMorosoIfCleared } = require("../services/installmentEnforcement");

function parsePositiveId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function divideAmount(totalCRC, numberOfInstallments) {
  const base = Math.floor(totalCRC / numberOfInstallments);
  const remainder = totalCRC - base * numberOfInstallments;
  return Array.from({ length: numberOfInstallments }, (_, i) => {
    return i === numberOfInstallments - 1 ? base + remainder : base;
  });
}

function generateDueDates(startDate, numberOfInstallments) {
  const start = new Date(startDate);
  return Array.from({ length: numberOfInstallments }, (_, i) => {
    const date = new Date(start);
    date.setMonth(date.getMonth() + i);
    return date;
  });
}

function serializePlan(plan) {
  const paid = plan.installments.filter((i) => i.status === InstallmentStatus.PAID).length;
  const overdue = plan.installments.filter((i) => i.status === InstallmentStatus.OVERDUE).length;
  return {
    ...plan,
    paidCount: paid,
    overdueCount: overdue,
    progress: plan.numberOfInstallments > 0 ? Math.round((paid / plan.numberOfInstallments) * 100) : 0
  };
}

async function createPlan(req, res, next) {
  try {
    const { clientId, description, totalAmountCRC, numberOfInstallments, startDate, notes } = req.body;

    const parsedClientId = parsePositiveId(clientId);
    if (!parsedClientId) {
      return res.status(400).json({ error: "clientId es requerido" });
    }

    const client = await prisma.user.findFirst({
      where: { id: parsedClientId, role: Role.CLIENT, isActive: true }
    });
    if (!client) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: "La descripción es requerida" });
    }

    const parsedAmount = Number(totalAmountCRC);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({ error: "El monto total debe ser al menos ₡100 (en centimos)" });
    }

    const parsedInstallments = Number(numberOfInstallments);
    if (![2, 3, 4, 6, 12].includes(parsedInstallments)) {
      return res.status(400).json({ error: "Número de cuotas debe ser 2, 3, 4, 6 o 12" });
    }

    const parsedStartDate = new Date(startDate || Date.now());
    if (Number.isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ error: "Fecha de inicio inválida" });
    }

    const amounts = divideAmount(Math.round(parsedAmount), parsedInstallments);
    const dueDates = generateDueDates(parsedStartDate, parsedInstallments);

    const plan = await prisma.$transaction(async (tx) => {
      const created = await tx.installmentPlan.create({
        data: {
          clientId: parsedClientId,
          description: String(description).trim(),
          totalAmountCRC: Math.round(parsedAmount),
          numberOfInstallments: parsedInstallments,
          installments: {
            create: amounts.map((amount, i) => ({
              sequenceNumber: i + 1,
              amountCRC: amount,
              dueDate: dueDates[i]
            }))
          }
        },
        include: {
          installments: { orderBy: { sequenceNumber: "asc" } },
          client: { select: { id: true, name: true, email: true } }
        }
      });

      return created;
    });

    const dashboardUrl = buildFrontendUrl("/dashboard/cuotas");
    const formatCRC = (cents) => `₡${(cents / 100).toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;

    await createNotification(parsedClientId, {
      title: "Plan de cuotas creado",
      body: `Se le ha asignado un plan de ${parsedInstallments} cuotas por ${formatCRC(plan.totalAmountCRC)} para: ${plan.description}`,
      type: NotifType.STATUS_CHANGE,
      linkUrl: "/dashboard/cuotas"
    });

    if (client.email) {
      const cuotasHtml = plan.installments.map((inst) =>
        `<tr><td>Cuota ${inst.sequenceNumber}</td><td>${formatCRC(inst.amountCRC)}</td><td>${new Date(inst.dueDate).toLocaleDateString("es-CR")}</td></tr>`
      ).join("");

      await sendEmail({
        to: client.email,
        subject: `Plan de cuotas: ${plan.description}`,
        html: renderEmailLayout({
          title: "Plan de cuotas creado",
          contentHtml: `
            <p>Hola ${client.name},</p>
            <p>Se le ha creado un plan de pagos por cuotas:</p>
            <p><strong>${plan.description}</strong></p>
            <p>Total: <strong>${formatCRC(plan.totalAmountCRC)}</strong> en <strong>${parsedInstallments} cuotas</strong></p>
            <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin:12px 0">
              <thead><tr><th>Cuota</th><th>Monto</th><th>Fecha de vencimiento</th></tr></thead>
              <tbody>${cuotasHtml}</tbody>
            </table>
            ${notes ? `<p><strong>Nota:</strong> ${notes}</p>` : ""}
            <p>Ver detalle en su dashboard: <a href="${dashboardUrl}">${dashboardUrl}</a></p>
          `
        })
      });
    }

    return res.status(201).json(serializePlan(plan));
  } catch (error) {
    return next(error);
  }
}

async function listPlans(req, res, next) {
  try {
    const isAdmin = req.user.role === Role.ADMIN;
    const where = isAdmin
      ? {}
      : { clientId: req.user.id };

    if (req.query.status) {
      where.status = String(req.query.status).toUpperCase();
    }

    const plans = await prisma.installmentPlan.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        installments: { orderBy: { sequenceNumber: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(plans.map(serializePlan));
  } catch (error) {
    return next(error);
  }
}

async function getPlan(req, res, next) {
  try {
    const parsedId = parsePositiveId(req.params.id);
    if (!parsedId) {
      return res.status(400).json({ error: "id inválido" });
    }

    const plan = await prisma.installmentPlan.findUnique({
      where: { id: parsedId },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        installments: { orderBy: { sequenceNumber: "asc" } },
        order: { select: { id: true, type: true, status: true } },
        cartOrder: { select: { id: true, status: true } }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: "Plan no encontrado" });
    }

    const isAdmin = req.user.role === Role.ADMIN;
    if (!isAdmin && plan.clientId !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    return res.json(serializePlan(plan));
  } catch (error) {
    return next(error);
  }
}

async function generatePaymentLink(req, res, next) {
  try {
    const planId = parsePositiveId(req.params.planId);
    const installmentId = parsePositiveId(req.params.installmentId);
    if (!planId || !installmentId) {
      return res.status(400).json({ error: "IDs inválidos" });
    }

    const installment = await prisma.installment.findFirst({
      where: { id: installmentId, installmentPlanId: planId },
      include: {
        installmentPlan: {
          include: { client: { select: { id: true, name: true, email: true } } }
        }
      }
    });

    if (!installment) {
      return res.status(404).json({ error: "Cuota no encontrada" });
    }

    if (installment.status === InstallmentStatus.PAID) {
      return res.status(400).json({ error: "Esta cuota ya está pagada" });
    }

    if (installment.status === InstallmentStatus.CANCELLED) {
      return res.status(400).json({ error: "Esta cuota está cancelada" });
    }

    const isAdmin = req.user.role === Role.ADMIN;
    if (!isAdmin && installment.installmentPlan.clientId !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const plan = installment.installmentPlan;
    const totalWithPenalty = installment.amountCRC + (installment.penaltyFeeCRC || 0);
    const hasPenalty = (installment.penaltyFeeCRC || 0) > 0;
    const description = `${plan.description} - Cuota ${installment.sequenceNumber}/${plan.numberOfInstallments}${hasPenalty ? " (incluye recargo)" : ""}`;

    const session = await createOneTimeCheckoutSession({
      amountCRC: totalWithPenalty,
      description,
      customerEmail: plan.client.email,
      metadata: {
        installmentId: String(installment.id),
        installmentPlanId: String(plan.id),
        clientId: String(plan.clientId),
        type: "INSTALLMENT"
      }
    });

    await prisma.installment.update({
      where: { id: installment.id },
      data: {
        paymentIntentId: session.paymentIntentId || null,
        checkoutUrl: session.url
      }
    });

    return res.json({ url: session.url, installmentId: installment.id });
  } catch (error) {
    return next(error);
  }
}

async function cancelPlan(req, res, next) {
  try {
    const parsedId = parsePositiveId(req.params.id);
    if (!parsedId) {
      return res.status(400).json({ error: "id inválido" });
    }

    const plan = await prisma.installmentPlan.findUnique({
      where: { id: parsedId },
      include: {
        client: { select: { id: true, name: true } },
        installments: true
      }
    });

    if (!plan) {
      return res.status(404).json({ error: "Plan no encontrado" });
    }

    if (plan.status === InstallmentPlanStatus.CANCELLED || plan.status === InstallmentPlanStatus.COMPLETED) {
      return res.status(400).json({ error: `El plan ya está ${plan.status === InstallmentPlanStatus.CANCELLED ? "cancelado" : "completado"}` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.installmentPlan.update({
        where: { id: parsedId },
        data: { status: InstallmentPlanStatus.CANCELLED }
      });

      await tx.installment.updateMany({
        where: {
          installmentPlanId: parsedId,
          status: { in: [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE] }
        },
        data: { status: InstallmentStatus.CANCELLED }
      });
    });

    await createNotification(plan.clientId, {
      title: "Plan de cuotas cancelado",
      body: `Su plan de cuotas "${plan.description}" ha sido cancelado.`,
      type: NotifType.STATUS_CHANGE,
      linkUrl: "/dashboard/cuotas"
    });

    return res.json({ message: "Plan cancelado correctamente" });
  } catch (error) {
    return next(error);
  }
}

async function handleInstallmentPayment(installment) {
  if (installment.status === InstallmentStatus.PAID) {
    return { alreadyPaid: true };
  }

  const updatedInstallment = await prisma.installment.update({
    where: { id: installment.id },
    data: { status: InstallmentStatus.PAID, paidAt: new Date() }
  });

  const plan = await prisma.installmentPlan.findUnique({
    where: { id: installment.installmentPlanId },
    include: {
      installments: true,
      client: { select: { id: true, name: true } }
    }
  });

  const allPaid = plan.installments.every(
    (i) => i.id === installment.id ? true : i.status === InstallmentStatus.PAID
  );

  if (allPaid) {
    await prisma.installmentPlan.update({
      where: { id: plan.id },
      data: { status: InstallmentPlanStatus.COMPLETED }
    });

    await createNotification(plan.clientId, {
      title: "Plan de cuotas completado",
      body: `¡Felicidades! Ha completado todos los pagos de "${plan.description}".`,
      type: NotifType.STATUS_CHANGE,
      linkUrl: "/dashboard/cuotas"
    });
  } else {
    await createNotification(plan.clientId, {
      title: "Cuota pagada",
      body: `Se ha registrado el pago de la cuota ${installment.sequenceNumber} de "${plan.description}".`,
      type: NotifType.STATUS_CHANGE,
      linkUrl: "/dashboard/cuotas"
    });
  }

  await liftMorosoIfCleared(plan.clientId);

  return { installment: updatedInstallment, planCompleted: allPaid };
}

async function createPlanCore({ clientId, description, totalAmountCRC, numberOfInstallments, startDate, orderId, cartOrderId }) {
  const amounts = divideAmount(Math.round(totalAmountCRC), numberOfInstallments);
  const dueDates = generateDueDates(startDate || new Date(), numberOfInstallments);

  return prisma.$transaction(async (tx) => {
    const created = await tx.installmentPlan.create({
      data: {
        clientId,
        description: String(description).trim(),
        totalAmountCRC: Math.round(totalAmountCRC),
        numberOfInstallments,
        ...(orderId ? { orderId } : {}),
        ...(cartOrderId ? { cartOrderId } : {}),
        installments: {
          create: amounts.map((amount, i) => ({
            sequenceNumber: i + 1,
            amountCRC: amount,
            dueDate: dueDates[i]
          }))
        }
      },
      include: {
        installments: { orderBy: { sequenceNumber: "asc" } },
        client: { select: { id: true, name: true, email: true } }
      }
    });

    return created;
  });
}

module.exports = {
  createPlan,
  createPlanCore,
  listPlans,
  getPlan,
  generatePaymentLink,
  cancelPlan,
  handleInstallmentPayment
};
