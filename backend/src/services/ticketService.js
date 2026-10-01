const { Role, NotifType, TicketStatus } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { triggerN8n } = require("../utils/n8nHelper");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const { createNotification } = require("../utils/notificationHelper");
const {
  parsePositiveInt,
  validateTicketBodyWithAttachments,
  buildTicketLink,
  emitTicketEvent,
  normalizeTicket,
  normalizeTicketMessage,
  buildTicketIncludes,
  notifyAdminsForTicket,
  deliverTicketMessageSideEffects,
  persistTicketMessage
} = require("../utils/ticketHelpers");

/**
 * Crea un nuevo ticket de soporte.
 * @param {Object} user El usuario que crea el ticket (req.user)
 * @param {Object} data Los datos del ticket (req.body)
 * @returns {Object} El ticket creado normalizado
 */
async function createTicketService(user, data) {
  const safeSubject = String(data?.subject || "").trim();
  const bodyValidation = validateTicketBodyWithAttachments(data?.body);
  
  if (bodyValidation.error) {
    throw { status: 400, message: bodyValidation.error };
  }
  
  const safeBody = bodyValidation.body;
  const visibleBody = bodyValidation.text;
  const parsedClientId = parsePositiveInt(data?.clientId);

  if (!safeSubject) {
    throw { status: 400, message: "subject es requerido" };
  }
  if (!visibleBody) {
    throw { status: 400, message: "body es requerido" };
  }

  let clientId = user.id;
  let assignedAgentId = null;

  if (user.role === Role.ADMIN) {
    if (!parsedClientId) {
      throw { status: 400, message: "clientId es requerido cuando el ticket lo crea un admin" };
    }
    clientId = parsedClientId;
  } else if (user.role === Role.COLABORADOR) {
    if (!parsedClientId) {
      throw { status: 400, message: "clientId es requerido cuando el ticket lo crea un colaborador" };
    }
    const link = await prisma.clientCollaborator.findUnique({
      where: { clientId_collaboratorId: { clientId: parsedClientId, collaboratorId: user.id } }
    });
    if (!link) {
      throw { status: 403, message: "No estas asignado a este cliente" };
    }
    clientId = parsedClientId;
    assignedAgentId = user.id;
  }

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, role: true, name: true, email: true, company: true, phone: true }
  });
  if (!client || (client.role !== Role.CLIENT && client.role !== Role.PROVEEDOR)) {
    throw { status: 404, message: "Cliente no encontrado" };
  }

  const parsedAssignedAgentId = parsePositiveInt(data?.assignedAgentId);
  if (parsedAssignedAgentId && user.role !== Role.COLABORADOR) {
    const link = await prisma.clientCollaborator.findUnique({
      where: { clientId_collaboratorId: { clientId, collaboratorId: parsedAssignedAgentId } }
    });
    if (!link) {
      throw { status: 400, message: "El colaborador no esta asignado a este cliente" };
    }
    assignedAgentId = parsedAssignedAgentId;
  }

  if (!assignedAgentId && (user.role === Role.CLIENT || user.role === Role.PROVEEDOR)) {
    const fallback = await prisma.clientCollaborator.findFirst({
      where: { clientId },
      include: { collaborator: { select: { id: true, isActive: true } } },
      orderBy: { assignedAt: "asc" }
    });
    if (fallback?.collaborator?.isActive) {
      assignedAgentId = fallback.collaboratorId;
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        clientId,
        subject: safeSubject,
        assignedAgentId
      }
    });

    await tx.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: user.id,
        body: safeBody
      }
    });

    return tx.ticket.findUnique({
      where: { id: ticket.id },
      include: buildTicketIncludes({ includeMessages: true })
    });
  });

  const adminLink = buildTicketLink(created.id, Role.ADMIN);
  const clientLink = buildTicketLink(created.id, Role.CLIENT);

  if (user.role === Role.CLIENT || user.role === Role.PROVEEDOR) {
    const admins = await notifyAdminsForTicket(
      created,
      `Nuevo ticket de soporte - ${created.subject}`,
      `${created.client.name}: ${visibleBody.slice(0, 120)}`,
      `/admin/tickets/${created.id}`
    );

    await Promise.allSettled(
      admins
        .filter((admin) => admin.email)
        .map((admin) =>
          sendEmail({
            to: admin.email,
            subject: `Nuevo ticket de soporte - ${created.subject}`,
            html: renderEmailLayout({
              title: "Nuevo ticket de soporte",
              contentHtml: `
                <p><strong>Cliente:</strong> ${created.client.name}</p>
                <p><strong>Empresa:</strong> ${created.client.company || "-"}</p>
                <p><strong>Asunto:</strong> ${created.subject}</p>
                <p><strong>Primer mensaje:</strong></p>
                <p style="white-space: pre-line;">${visibleBody}</p>
                <p>Ver en dashboard admin: <a href="${adminLink}">${adminLink}</a></p>
              `
            })
          })
        )
    );
  } else if (created.client.email) {
    await createNotification(created.client.id, {
      title: `Nuevo ticket de soporte - ${created.subject}`,
      body: "Se abrio un nuevo ticket de soporte.",
      type: NotifType.STATUS_CHANGE,
      linkUrl: `/dashboard/tickets/${created.id}`,
      metadata: { ticketId: created.id }
    });

    await sendEmail({
      to: created.client.email,
      subject: `Nuevo ticket de soporte - ${created.subject}`,
      html: renderEmailLayout({
        title: "Nuevo ticket de soporte",
        contentHtml: `
          <p>Hola ${created.client.name},</p>
          <p>Se abrio un ticket de soporte para tu cuenta.</p>
          <p><strong>Asunto:</strong> ${created.subject}</p>
          <p><strong>Mensaje inicial:</strong></p>
          <p style="white-space: pre-line;">${visibleBody}</p>
          <p>Ver ticket: <a href="${clientLink}">${clientLink}</a></p>
        `
      })
    });
  }

  try {
    await triggerN8n("ticket_created", {
      adminPhone: process.env.WHATSAPP_NUMBER,
      clientName: created.client.name,
      subject: created.subject,
      firstMessage: visibleBody
    });
  } catch (error) {
    console.warn("N8N notification failed:", error.message);
  }

  emitTicketEvent(created.id, "ticket:new-message", {
    ticketId: created.id,
    ticket: normalizeTicket(created),
    message: created.messages[created.messages.length - 1]
      ? normalizeTicketMessage(created.messages[created.messages.length - 1])
      : null
  });

  return { ticket: normalizeTicket(created) };
}

module.exports = {
  createTicketService
};
