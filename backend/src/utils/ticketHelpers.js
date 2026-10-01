const {
  CallRequestStatus,
  ContactMethod,
  NotifType,
  Role,
  TicketStatus
} = require("@prisma/client");
const prisma = require("../lib/prisma");
const { validateAttachmentsField } = require("../utils/attachmentValidator");
const { createNotification } = require("../utils/notificationHelper");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const {
  createCalendarEvent,
  deleteCalendarEvent,
  getEventDurationMinutes
} = require("../utils/googleCalendarHelper");
const { buildFrontendUrl } = require("./publicUrl");

const TICKET_META_MARKER = "\n\n[TICKET_META]";
const SCHEDULE_DAY_KEYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const CONTACT_METHOD_LABELS = {
  PHONE: "Llamada telefonica",
  WHATSAPP: "WhatsApp",
  GOOGLE_MEET: "Google Meet"
};

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("es-CR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatSlotLabels(startValue) {
  const start = new Date(startValue);
  return {
    dateLabel: start.toLocaleDateString("es-CR", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }),
    timeLabel: start.toLocaleTimeString("es-CR", {
      hour: "numeric",
      minute: "2-digit"
    }).toLowerCase()
  };
}

function buildTicketLink(ticketId, role) {
  return role === Role.ADMIN
    ? buildFrontendUrl(`/admin/tickets/${ticketId}`)
    : buildFrontendUrl(`/dashboard/tickets/${ticketId}`);
}

function encodeTicketBody(text, metadata) {
  const cleanText = String(text || "").trim();
  if (!metadata || typeof metadata !== "object") {
    return cleanText;
  }

  return `${cleanText}${TICKET_META_MARKER}${encodeURIComponent(JSON.stringify(metadata))}`;
}

function decodeTicketBody(value) {
  const rawBody = String(value || "").trim();
  const markerIndex = rawBody.indexOf(TICKET_META_MARKER);
  if (markerIndex === -1) {
    return { text: rawBody, metadata: null };
  }

  const text = rawBody.slice(0, markerIndex).trim();
  const encodedMetadata = rawBody.slice(markerIndex + TICKET_META_MARKER.length).trim();
  if (!encodedMetadata) {
    return { error: "Metadata de ticket inválida." };
  }

  try {
    const metadata = JSON.parse(decodeURIComponent(encodedMetadata));
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return { error: "Metadata de ticket inválida." };
    }
    return { text, metadata };
  } catch (_error) {
    return { error: "Metadata de ticket inválida." };
  }
}

function validateTicketBodyWithAttachments(value) {
  const decoded = decodeTicketBody(value);
  if (decoded.error) {
    return { error: decoded.error };
  }

  const metadata = decoded.metadata || {};
  const attachmentValidation = validateAttachmentsField(metadata.attachments);
  if (attachmentValidation.error) {
    return { error: attachmentValidation.error };
  }

  const safeMetadata = {};
  const category = String(metadata.category || "").trim();
  if (category) {
    safeMetadata.category = category.slice(0, 80);
  }
  if (attachmentValidation.attachments.length) {
    safeMetadata.attachments = attachmentValidation.attachments;
  }

  return {
    text: decoded.text,
    body: Object.keys(safeMetadata).length ? encodeTicketBody(decoded.text, safeMetadata) : decoded.text,
    metadata: safeMetadata
  };
}

function serializeScheduleSlot(start, end) {
  const { dateLabel, timeLabel } = formatSlotLabels(start);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    dateLabel,
    timeLabel,
    label: `${dateLabel} · ${timeLabel}`
  };
}

function buildUpcomingScheduleSlots(schedule, { limit = 8, horizonDays = 21 } = {}) {
  if (!schedule || typeof schedule !== "object") {
    return [];
  }

  const durationMs = getEventDurationMinutes() * 60_000;
  const now = new Date();
  const slots = [];

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const dayProbe = new Date(now);
    dayProbe.setDate(now.getDate() + dayOffset);
    dayProbe.setHours(0, 0, 0, 0);

    const dayKey = SCHEDULE_DAY_KEYS[dayProbe.getDay()];
    const hours = Array.isArray(schedule[dayKey]) ? [...schedule[dayKey]].sort((a, b) => a - b) : [];

    for (const hourValue of hours) {
      const parsedHour = Number.parseInt(hourValue, 10);
      if (!Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) {
        continue;
      }

      const start = new Date(dayProbe);
      start.setHours(parsedHour, 0, 0, 0);
      if (start <= now) {
        continue;
      }

      const end = new Date(start.getTime() + durationMs);
      slots.push(serializeScheduleSlot(start, end));

      if (slots.length >= limit) {
        return slots;
      }
    }
  }

  return slots;
}

function normalizeTicketMessage(message) {
  return {
    id: message.id,
    ticketId: message.ticketId,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt,
    sender: message.sender
      ? {
        id: message.sender.id,
        name: message.sender.name,
        email: message.sender.email,
        role: message.sender.role
      }
      : null
  };
}

function normalizeCallRequest(callRequest) {
  return {
    id: callRequest.id,
    ticketId: callRequest.ticketId,
    requestedById: callRequest.requestedById,
    status: callRequest.status,
    suggestedSlots: Array.isArray(callRequest.suggestedSlots) ? callRequest.suggestedSlots : [],
    preferredStart: callRequest.preferredStart,
    selectedStart: callRequest.selectedStart,
    selectedEnd: callRequest.selectedEnd,
    contactMethod: callRequest.contactMethod,
    calendarEventId: callRequest.calendarEventId,
    calendarHtmlLink: callRequest.calendarHtmlLink,
    createdAt: callRequest.createdAt,
    updatedAt: callRequest.updatedAt,
    respondedAt: callRequest.respondedAt,
    requestedBy: callRequest.requestedBy
      ? {
        id: callRequest.requestedBy.id,
        name: callRequest.requestedBy.name,
        email: callRequest.requestedBy.email,
        role: callRequest.requestedBy.role
      }
      : null
  };
}

function normalizeTicket(ticket) {
  const latestMessage = ticket.messages?.[0] || null;

  return {
    id: ticket.id,
    clientId: ticket.clientId,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    client: ticket.client
      ? {
        id: ticket.client.id,
        name: ticket.client.name,
        email: ticket.client.email,
        company: ticket.client.company,
        phone: ticket.client.phone
      }
      : null,
    latestMessage: latestMessage ? normalizeTicketMessage(latestMessage) : null,
    messages: ticket.messages ? ticket.messages.map(normalizeTicketMessage) : undefined,
    callRequests: ticket.callRequests ? ticket.callRequests.map(normalizeCallRequest) : undefined
  };
}

function buildTicketIncludes({ includeMessages = true }) {
  return {
    client: {
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        phone: true
      }
    },
    assignedAgent: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    },
    messages: {
      orderBy: {
        createdAt: includeMessages ? "asc" : "desc"
      },
      take: includeMessages ? undefined : 1,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    },
    callRequests: {
      orderBy: {
        createdAt: "desc"
      },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    }
  };
}

async function findTicketForUser(ticketId, user, includeMessages = true) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: buildTicketIncludes({ includeMessages })
  });

  if (!ticket) {
    return null;
  }

  if (user.role === Role.ADMIN) {
    return ticket;
  }

  if (ticket.clientId === user.id) {
    return ticket;
  }

  if (user.role === Role.COLABORADOR) {
    if (ticket.assignedAgentId === user.id) {
      return ticket;
    }
    if (ticket.clientId) {
      const assignment = await prisma.clientCollaborator.findUnique({
        where: { clientId_collaboratorId: { clientId: ticket.clientId, collaboratorId: user.id } }
      });
      if (assignment) {
        return ticket;
      }
    }
  }

  return "forbidden";
}

function emitTicketEvent(ticketId, event, payload) {
  try {
    const { io } = require("../index");
    if (io) {
      io.to(`ticket-${ticketId}`).emit(event, payload);
    }
  } catch (_error) {
    // Socket emission should never break the HTTP flow.
  }
}

async function notifyAdminsForTicket(ticket, title, body, linkUrl, metadata = {}) {
  let recipients = [];

  if (ticket.assignedAgentId) {
    const agent = await prisma.user.findUnique({
      where: { id: ticket.assignedAgentId },
      select: { id: true, email: true, name: true, role: true }
    });
    if (agent) {
      recipients = [agent];
    }
  }

  if (!recipients.length && ticket.clientId) {
    const assignments = await prisma.clientCollaborator.findMany({
      where: { clientId: ticket.clientId },
      include: { collaborator: { select: { id: true, email: true, name: true, role: true, isActive: true } } }
    });
    recipients = assignments
      .map((a) => a.collaborator)
      .filter((c) => c?.isActive);
  }

  if (!recipients.length) {
    recipients = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true, email: true, name: true, role: true }
    });
  }

  await Promise.all(recipients.map(async (recipient) => {
    const targetLink = recipient.role === Role.COLABORADOR
      ? `/colaborador/tickets/${ticket.id}`
      : linkUrl;
    await createNotification(recipient.id, {
      title,
      body,
      type: NotifType.STATUS_CHANGE,
      linkUrl: targetLink,
      metadata: {
        ticketId: ticket.id,
        ...metadata
      }
    });
  }));

  return recipients;
}

async function deliverTicketMessageSideEffects({ ticket, senderRole, body, metadata = {} }) {
  const adminLink = buildTicketLink(ticket.id, Role.ADMIN);
  const clientLink = buildTicketLink(ticket.id, Role.CLIENT);

  if (senderRole === Role.ADMIN || senderRole === Role.COLABORADOR) {
    if (ticket.client?.id) {
      await createNotification(ticket.client.id, {
        title: `Nueva respuesta en ticket: ${ticket.subject}`,
        body: body.slice(0, 140),
        type: NotifType.STATUS_CHANGE,
        linkUrl: `/dashboard/tickets/${ticket.id}`,
        metadata: {
          ticketId: ticket.id,
          ...metadata
        }
      });
    }

    if (ticket.client?.email) {
      await sendEmail({
        to: ticket.client.email,
        subject: `Nueva respuesta en ticket: ${ticket.subject}`,
        html: renderEmailLayout({
          title: "Nueva respuesta en ticket",
          contentHtml: `
            <p>Hola ${ticket.client.name},</p>
            <p>Hay una nueva respuesta en tu ticket <strong>${ticket.subject}</strong>.</p>
            <p style="white-space: pre-line;">${body}</p>
            <p>Ver hilo: <a href="${clientLink}">${clientLink}</a></p>
          `
        })
      });
    }

    return;
  }

  const admins = await notifyAdminsForTicket(
    ticket,
    `Nueva respuesta en ticket: ${ticket.subject}`,
    body.slice(0, 140),
    `/admin/tickets/${ticket.id}`,
    metadata
  );

  await Promise.allSettled(
    admins
      .filter((admin) => admin.email)
      .map((admin) =>
        sendEmail({
          to: admin.email,
          subject: `Nueva respuesta en ticket: ${ticket.subject}`,
          html: renderEmailLayout({
            title: "Nueva respuesta en ticket",
            contentHtml: `
              <p><strong>Cliente:</strong> ${ticket.client?.name || "Cliente"}</p>
              <p><strong>Asunto:</strong> ${ticket.subject}</p>
              <p style="white-space: pre-line;">${body}</p>
              <p>Ver hilo: <a href="${adminLink}">${adminLink}</a></p>
            `
          })
        })
      )
  );
}

async function persistTicketMessage({ ticketId, senderId, senderRole, body }) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.ticketMessage.create({
      data: {
        ticketId,
        senderId,
        body
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (senderRole === Role.ADMIN) {
      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS }
      });
    }

    return message;
  });
}

function buildCallRequestMessageBody({ preferredSlot, callRequestId }) {
  const summary = preferredSlot?.label
    ? `Solicitud de llamada enviada. Bloque sugerido: ${preferredSlot.label}.`
    : "Solicitud de llamada enviada.";

  return encodeTicketBody(summary, {
    type: "call_request",
    callRequestId
  });
}

function buildClientScheduleMessage({ selectedSlot, contactMethod, callRequestId, calendarHtmlLink }) {
  const lines = [
    `He agendado la llamada para ${selectedSlot.dateLabel} a las ${selectedSlot.timeLabel}.`,
    `Medio elegido: ${CONTACT_METHOD_LABELS[contactMethod] || contactMethod}.`
  ];

  if (calendarHtmlLink) {
    lines.push(`Enlace del evento: ${calendarHtmlLink}`);
  }

  return encodeTicketBody(lines.join("\n"), {
    type: "call_request_response",
    callRequestId
  });
}

function buildCallRescheduleMessage({ selectedSlot, contactMethod, callRequestId, calendarHtmlLink }) {
  const lines = [
    `La llamada fue reprogramada para ${selectedSlot.dateLabel} a las ${selectedSlot.timeLabel}.`,
    `Medio confirmado: ${CONTACT_METHOD_LABELS[contactMethod] || contactMethod}.`
  ];

  if (calendarHtmlLink) {
    lines.push(`Enlace actualizado del evento: ${calendarHtmlLink}`);
  }

  return encodeTicketBody(lines.join("\n"), {
    type: "call_request_rescheduled",
    callRequestId
  });
}

function buildCallCancellationMessage({ callRequestId, actorRole, selectedStart, reason }) {
  const actorLabel = actorRole === Role.ADMIN ? "El asesor" : "El cliente";
  const lines = [`${actorLabel} canceló la llamada agendada.`];

  if (selectedStart) {
    const { dateLabel, timeLabel } = formatSlotLabels(selectedStart);
    lines.push(`Horario anterior: ${dateLabel} a las ${timeLabel}.`);
  }

  if (reason) {
    lines.push(`Motivo: ${reason}.`);
  }

  return encodeTicketBody(lines.join("\n"), {
    type: "call_request_cancelled",
    callRequestId
  });
}

function canManageCallRequest(callRequest, user) {
  return user.role === Role.ADMIN || callRequest.ticket.clientId === user.id;
}

async function getAvailableCallSlots() {
  const adminStatus = await prisma.adminStatus.findUnique({
    where: { id: 1 },
    select: { schedule: true }
  });

  return buildUpcomingScheduleSlots(adminStatus?.schedule, { limit: 8, horizonDays: 21 });
}

async function deleteCalendarEventIfPresent(calendarEventId) {
  if (!String(calendarEventId || "").trim()) {
    return;
  }

  try {
    await deleteCalendarEvent(calendarEventId);
  } catch (error) {
    if (error?.code === "GOOGLE_CALENDAR_EVENT_NOT_FOUND") {
      return;
    }
    throw error;
  }
}

module.exports = {
  parsePositiveInt,
  parseDate,
  formatDateTime,
  formatSlotLabels,
  CONTACT_METHOD_LABELS,
  buildTicketLink,
  encodeTicketBody,
  decodeTicketBody,
  validateTicketBodyWithAttachments,
  serializeScheduleSlot,
  buildUpcomingScheduleSlots,
  normalizeTicketMessage,
  normalizeCallRequest,
  normalizeTicket,
  buildTicketIncludes,
  findTicketForUser,
  emitTicketEvent,
  notifyAdminsForTicket,
  deliverTicketMessageSideEffects,
  persistTicketMessage,
  buildCallRequestMessageBody,
  buildClientScheduleMessage,
  buildCallRescheduleMessage,
  buildCallCancellationMessage,
  createCalendarEvent,
  canManageCallRequest,
  getAvailableCallSlots,
  deleteCalendarEventIfPresent
};
