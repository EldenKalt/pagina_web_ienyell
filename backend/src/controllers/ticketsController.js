const {
  CallRequestStatus,
  ContactMethod,
  NotifType,
  Role,
  TicketStatus
} = require("@prisma/client");
const prisma = require("../lib/prisma");
const { parseBulkIds } = require("../utils/bulkIds");
const { triggerN8n } = require("../utils/n8nHelper");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const { createNotification } = require("../utils/notificationHelper");
const ticketHelpers = require("../utils/ticketHelpers");
const {
  parsePositiveInt,
  validateTicketBodyWithAttachments,
  buildTicketLink,
  emitTicketEvent,
  normalizeTicket,
  normalizeTicketMessage,
  buildTicketIncludes,
  CONTACT_METHOD_LABELS,
  notifyAdminsForTicket,
  getAvailableCallSlots,
  parseDate,
  canManageCallRequest,
  formatSlotLabels,
  buildCallRequestMessageBody,
  normalizeCallRequest,
  deleteCalendarEventIfPresent,
  buildCallCancellationMessage,
  buildClientScheduleMessage,
  buildCallRescheduleMessage,
  createCalendarEvent,
  findTicketForUser,
  deliverTicketMessageSideEffects,
  persistTicketMessage
} = ticketHelpers;
const { createTicketService } = require("../services/ticketService");


async function createTicket(req, res, next) {
  try {
    const result = await createTicketService(req.user, req.body);
    return res.status(201).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
}

async function bulkDeleteTickets(req, res, next) {
  try {
    const { ids, error } = parseBulkIds(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      await tx.ticketCallRequest.deleteMany({ where: { ticketId: { in: ids } } });
      await tx.ticketMessage.deleteMany({ where: { ticketId: { in: ids } } });
      const result = await tx.ticket.deleteMany({ where: { id: { in: ids } } });
      return result.count;
    });

    return res.json({ deleted });
  } catch (requestError) {
    return next(requestError);
  }
}

async function getTickets(req, res, next) {
  try {
    let where;
    if (req.user.role === Role.ADMIN) {
      where = {};
    } else if (req.user.role === Role.COLABORADOR) {
      const myClientIds = await prisma.clientCollaborator.findMany({
        where: { collaboratorId: req.user.id },
        select: { clientId: true }
      }).then((rows) => rows.map((r) => r.clientId));

      where = {
        OR: [
          { assignedAgentId: req.user.id },
          ...(myClientIds.length ? [{ clientId: { in: myClientIds }, assignedAgentId: null }] : [])
        ]
      };
    } else {
      where = { clientId: req.user.id };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
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
          select: { id: true, name: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
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
          orderBy: { createdAt: "desc" },
          take: 1,
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
      }
    });

    return res.json({
      tickets: tickets.map(normalizeTicket)
    });
  } catch (error) {
    return next(error);
  }
}

async function getTicketById(req, res, next) {
  try {
    const ticketId = parsePositiveInt(req.params.id);
    if (!ticketId) {
      return res.status(400).json({ error: "id invalido" });
    }

    const ticket = await findTicketForUser(ticketId, req.user, true);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }
    if (ticket === "forbidden") {
      return res.status(403).json({ error: "No tienes permiso para este ticket" });
    }

    return res.json({
      ticket: normalizeTicket(ticket)
    });
  } catch (error) {
    return next(error);
  }
}

async function addMessage(req, res, next) {
  try {
    const ticketId = parsePositiveInt(req.params.id);
    const bodyValidation = validateTicketBodyWithAttachments(req.body?.body);
    if (bodyValidation.error) {
      return res.status(400).json({ error: bodyValidation.error });
    }
    const safeBody = bodyValidation.body;
    const visibleBody = bodyValidation.text;

    if (!ticketId) {
      return res.status(400).json({ error: "id invalido" });
    }
    if (!visibleBody) {
      return res.status(400).json({ error: "body es requerido" });
    }

    const ticket = await findTicketForUser(ticketId, req.user, false);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }
    if (ticket === "forbidden") {
      return res.status(403).json({ error: "No tienes permiso para este ticket" });
    }

    const createdMessage = await persistTicketMessage({
      ticketId,
      senderId: req.user.id,
      senderRole: req.user.role,
      body: safeBody
    });

    await deliverTicketMessageSideEffects({
      ticket,
      senderRole: req.user.role,
      body: visibleBody
    });

    if (req.user.role === Role.ADMIN) {
      try {
        await triggerN8n("ticket_reply_to_client", {
          clientPhone: ticket.client?.phone,
          clientName: ticket.client?.name,
          subject: ticket.subject,
          replyPreview: visibleBody.substring(0, 100)
        });
      } catch (error) {
        console.warn("N8N notification failed:", error.message);
      }
    }

    const refreshedTicket = await findTicketForUser(ticketId, req.user, true);
    emitTicketEvent(ticketId, "ticket:new-message", {
      ticketId,
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null,
      message: normalizeTicketMessage(createdMessage)
    });

    return res.status(201).json({
      message: normalizeTicketMessage(createdMessage)
    });
  } catch (error) {
    return next(error);
  }
}

async function updateTicketStatus(req, res, next) {
  try {
    const ticketId = parsePositiveInt(req.params.id);
    const status = String(req.body?.status || "").trim();

    if (!ticketId) {
      return res.status(400).json({ error: "id invalido" });
    }
    if (!Object.values(TicketStatus).includes(status)) {
      return res.status(400).json({ error: "status debe ser OPEN, IN_PROGRESS o CLOSED" });
    }

    const existing = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true }
    });
    if (!existing) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            phone: true
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
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
          orderBy: { createdAt: "desc" },
          take: 1,
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
      }
    });

    emitTicketEvent(ticketId, "ticket:status-changed", {
      ticketId,
      status: ticket.status,
      ticket: normalizeTicket(ticket)
    });

    return res.json({
      ticket: normalizeTicket(ticket)
    });
  } catch (error) {
    return next(error);
  }
}

async function createCallRequest(req, res, next) {
  try {
    const ticketId = parsePositiveInt(req.params.id);
    const preferredStart = parseDate(req.body?.preferredStart);

    if (!ticketId) {
      return res.status(400).json({ error: "id invalido" });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: buildTicketIncludes({ includeMessages: false })
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    const suggestedSlots = await getAvailableCallSlots();

    if (!suggestedSlots.length) {
      return res.status(400).json({ error: "No hay horarios disponibles configurados para solicitar la llamada" });
    }

    let preferredSlot = null;
    if (preferredStart) {
      preferredSlot = suggestedSlots.find((slot) => new Date(slot.start).toISOString() === preferredStart.toISOString()) || null;
      if (!preferredSlot) {
        return res.status(400).json({ error: "preferredStart no coincide con los bloques disponibles" });
      }
    } else {
      preferredSlot = suggestedSlots[0];
    }

    const created = await prisma.$transaction(async (tx) => {
      const callRequest = await tx.ticketCallRequest.create({
        data: {
          ticketId,
          requestedById: req.user.id,
          suggestedSlots,
          preferredStart: preferredSlot?.start ? new Date(preferredSlot.start) : null
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
      });

      const message = await tx.ticketMessage.create({
        data: {
          ticketId,
          senderId: req.user.id,
          body: buildCallRequestMessageBody({
            preferredSlot,
            callRequestId: callRequest.id
          })
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

      await tx.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS }
      });

      return { callRequest, message };
    });

    await deliverTicketMessageSideEffects({
      ticket,
      senderRole: Role.ADMIN,
      body: "Se ha enviado una solicitud para agendar una llamada.",
      metadata: { callRequestId: created.callRequest.id }
    });

    const refreshedTicket = await findTicketForUser(ticketId, req.user, true);
    emitTicketEvent(ticketId, "ticket:new-message", {
      ticketId,
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null,
      message: normalizeTicketMessage(created.message)
    });

    return res.status(201).json({
      callRequest: normalizeCallRequest(created.callRequest),
      message: normalizeTicketMessage(created.message),
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null
    });
  } catch (error) {
    return next(error);
  }
}

async function scheduleCallRequest(req, res, next) {
  try {
    const requestId = parsePositiveInt(req.params.requestId);
    const selectedStart = parseDate(req.body?.selectedStart);
    const contactMethod = String(req.body?.contactMethod || "").trim();

    if (!requestId) {
      return res.status(400).json({ error: "requestId invalido" });
    }
    if (!selectedStart) {
      return res.status(400).json({ error: "selectedStart es requerido" });
    }
    if (!Object.values(ContactMethod).includes(contactMethod)) {
      return res.status(400).json({ error: "contactMethod debe ser PHONE, WHATSAPP o GOOGLE_MEET" });
    }

    const callRequest = await prisma.ticketCallRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        ticket: {
          include: buildTicketIncludes({ includeMessages: false })
        }
      }
    });

    if (!callRequest) {
      return res.status(404).json({ error: "Solicitud de llamada no encontrada" });
    }
    if (callRequest.ticket.clientId !== req.user.id) {
      return res.status(403).json({ error: "No tienes permiso para esta solicitud de llamada" });
    }
    if (callRequest.status !== CallRequestStatus.PENDING) {
      return res.status(400).json({ error: "La solicitud ya no esta pendiente" });
    }

    const suggestedSlots = Array.isArray(callRequest.suggestedSlots) ? callRequest.suggestedSlots : [];
    const selectedSlot = suggestedSlots.find(
      (slot) => new Date(slot.start).toISOString() === selectedStart.toISOString()
    );

    if (!selectedSlot) {
      return res.status(400).json({ error: "selectedStart no coincide con los bloques ofrecidos" });
    }

    const calendarEvent = await createCalendarEvent({
      ticket: callRequest.ticket,
      client: callRequest.ticket.client,
      start: new Date(selectedSlot.start),
      contactMethod
    });

    const clientMessageBody = buildClientScheduleMessage({
      selectedSlot,
      contactMethod,
      callRequestId: callRequest.id,
      calendarHtmlLink: calendarEvent.calendarHtmlLink
    });

    const created = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.ticketCallRequest.update({
        where: { id: callRequest.id },
        data: {
          status: CallRequestStatus.SCHEDULED,
          selectedStart: new Date(selectedSlot.start),
          selectedEnd: calendarEvent.selectedEnd,
          contactMethod,
          calendarEventId: calendarEvent.calendarEventId,
          calendarHtmlLink: calendarEvent.calendarHtmlLink,
          respondedAt: new Date()
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
      });

      const message = await tx.ticketMessage.create({
        data: {
          ticketId: callRequest.ticketId,
          senderId: req.user.id,
          body: clientMessageBody
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

      return { updatedRequest, message };
    });

    await deliverTicketMessageSideEffects({
      ticket: callRequest.ticket,
      senderRole: Role.CLIENT,
      body: `He confirmado la llamada para ${selectedSlot.dateLabel} a las ${selectedSlot.timeLabel} por ${CONTACT_METHOD_LABELS[contactMethod]}.`,
      metadata: { callRequestId: callRequest.id }
    });

    if (callRequest.ticket.client?.email) {
      await sendEmail({
        to: callRequest.ticket.client.email,
        subject: `Llamada agendada - ${callRequest.ticket.subject}`,
        html: renderEmailLayout({
          title: "Llamada agendada",
          contentHtml: `
            <p>Hola ${callRequest.ticket.client.name},</p>
            <p>La llamada quedo agendada para <strong>${selectedSlot.dateLabel}</strong> a las <strong>${selectedSlot.timeLabel}</strong>.</p>
            <p><strong>Medio:</strong> ${CONTACT_METHOD_LABELS[contactMethod]}</p>
            ${calendarEvent.calendarHtmlLink ? `<p><a href="${calendarEvent.calendarHtmlLink}">Abrir evento en Google Calendar</a></p>` : ""}
          `
        })
      });
    }

    const refreshedTicket = await findTicketForUser(callRequest.ticketId, req.user, true);
    emitTicketEvent(callRequest.ticketId, "ticket:new-message", {
      ticketId: callRequest.ticketId,
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null,
      message: normalizeTicketMessage(created.message)
    });
    emitTicketEvent(callRequest.ticketId, "ticket:call-request-updated", {
      ticketId: callRequest.ticketId,
      callRequest: normalizeCallRequest(created.updatedRequest),
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null
    });

    return res.status(201).json({
      callRequest: normalizeCallRequest(created.updatedRequest),
      message: normalizeTicketMessage(created.message),
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null
    });
  } catch (error) {
    return next(error);
  }
}

async function cancelCallRequest(req, res, next) {
  try {
    const requestId = parsePositiveInt(req.params.requestId);
    const reason = String(req.body?.reason || "").trim();

    if (!requestId) {
      return res.status(400).json({ error: "requestId invalido" });
    }

    const callRequest = await prisma.ticketCallRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        ticket: {
          include: buildTicketIncludes({ includeMessages: false })
        }
      }
    });

    if (!callRequest) {
      return res.status(404).json({ error: "Solicitud de llamada no encontrada" });
    }
    if (!canManageCallRequest(callRequest, req.user)) {
      return res.status(403).json({ error: "No tienes permiso para esta solicitud de llamada" });
    }
    if (callRequest.status === CallRequestStatus.CANCELLED) {
      return res.status(400).json({ error: "La solicitud ya fue cancelada" });
    }

    await deleteCalendarEventIfPresent(callRequest.calendarEventId);

    const messageBody = buildCallCancellationMessage({
      callRequestId: callRequest.id,
      actorRole: req.user.role,
      selectedStart: callRequest.selectedStart || callRequest.preferredStart,
      reason
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.ticketCallRequest.update({
        where: { id: callRequest.id },
        data: {
          status: CallRequestStatus.CANCELLED,
          calendarEventId: null,
          calendarHtmlLink: null,
          respondedAt: new Date()
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
      });

      const message = await tx.ticketMessage.create({
        data: {
          ticketId: callRequest.ticketId,
          senderId: req.user.id,
          body: messageBody
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

      return { updatedRequest, message };
    });

    await deliverTicketMessageSideEffects({
      ticket: callRequest.ticket,
      senderRole: req.user.role,
      body: reason
        ? `La llamada fue cancelada. Motivo: ${reason}.`
        : "La llamada fue cancelada.",
      metadata: { callRequestId: callRequest.id }
    });

    const refreshedTicket = await findTicketForUser(callRequest.ticketId, req.user, true);
    emitTicketEvent(callRequest.ticketId, "ticket:new-message", {
      ticketId: callRequest.ticketId,
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null,
      message: normalizeTicketMessage(updated.message)
    });
    emitTicketEvent(callRequest.ticketId, "ticket:call-request-updated", {
      ticketId: callRequest.ticketId,
      callRequest: normalizeCallRequest(updated.updatedRequest),
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null
    });

    return res.json({
      callRequest: normalizeCallRequest(updated.updatedRequest),
      message: normalizeTicketMessage(updated.message),
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null
    });
  } catch (error) {
    return next(error);
  }
}

async function rescheduleCallRequest(req, res, next) {
  try {
    const requestId = parsePositiveInt(req.params.requestId);
    const selectedStart = parseDate(req.body?.selectedStart);
    const contactMethod = String(req.body?.contactMethod || "").trim();

    if (!requestId) {
      return res.status(400).json({ error: "requestId invalido" });
    }
    if (!selectedStart) {
      return res.status(400).json({ error: "selectedStart es requerido" });
    }
    if (!Object.values(ContactMethod).includes(contactMethod)) {
      return res.status(400).json({ error: "contactMethod debe ser PHONE, WHATSAPP o GOOGLE_MEET" });
    }

    const callRequest = await prisma.ticketCallRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        ticket: {
          include: buildTicketIncludes({ includeMessages: false })
        }
      }
    });

    if (!callRequest) {
      return res.status(404).json({ error: "Solicitud de llamada no encontrada" });
    }
    if (!canManageCallRequest(callRequest, req.user)) {
      return res.status(403).json({ error: "No tienes permiso para esta solicitud de llamada" });
    }
    if (callRequest.status !== CallRequestStatus.SCHEDULED) {
      return res.status(400).json({ error: "Solo se pueden reprogramar llamadas ya agendadas" });
    }

    const suggestedSlots = await getAvailableCallSlots();
    if (!suggestedSlots.length) {
      return res.status(400).json({ error: "No hay horarios disponibles configurados para reprogramar la llamada" });
    }

    const selectedSlot = suggestedSlots.find(
      (slot) => new Date(slot.start).toISOString() === selectedStart.toISOString()
    );

    if (!selectedSlot) {
      return res.status(400).json({ error: "selectedStart no coincide con los bloques disponibles actuales" });
    }

    await deleteCalendarEventIfPresent(callRequest.calendarEventId);

    const calendarEvent = await createCalendarEvent({
      ticket: callRequest.ticket,
      client: callRequest.ticket.client,
      start: new Date(selectedSlot.start),
      contactMethod
    });

    const messageBody = buildCallRescheduleMessage({
      selectedSlot,
      contactMethod,
      callRequestId: callRequest.id,
      calendarHtmlLink: calendarEvent.calendarHtmlLink
    });

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.ticketCallRequest.update({
        where: { id: callRequest.id },
        data: {
          status: CallRequestStatus.SCHEDULED,
          suggestedSlots,
          selectedStart: new Date(selectedSlot.start),
          selectedEnd: calendarEvent.selectedEnd,
          contactMethod,
          calendarEventId: calendarEvent.calendarEventId,
          calendarHtmlLink: calendarEvent.calendarHtmlLink,
          respondedAt: new Date()
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
      });

      const message = await tx.ticketMessage.create({
        data: {
          ticketId: callRequest.ticketId,
          senderId: req.user.id,
          body: messageBody
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

      return { updatedRequest, message };
    });

    await deliverTicketMessageSideEffects({
      ticket: callRequest.ticket,
      senderRole: req.user.role,
      body: `La llamada fue reprogramada para ${selectedSlot.dateLabel} a las ${selectedSlot.timeLabel} por ${CONTACT_METHOD_LABELS[contactMethod]}.`,
      metadata: { callRequestId: callRequest.id }
    });

    const refreshedTicket = await findTicketForUser(callRequest.ticketId, req.user, true);
    emitTicketEvent(callRequest.ticketId, "ticket:new-message", {
      ticketId: callRequest.ticketId,
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null,
      message: normalizeTicketMessage(updated.message)
    });
    emitTicketEvent(callRequest.ticketId, "ticket:call-request-updated", {
      ticketId: callRequest.ticketId,
      callRequest: normalizeCallRequest(updated.updatedRequest),
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null
    });

    return res.json({
      callRequest: normalizeCallRequest(updated.updatedRequest),
      message: normalizeTicketMessage(updated.message),
      ticket: refreshedTicket ? normalizeTicket(refreshedTicket) : null
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTicket,
  bulkDeleteTickets,
  getTickets,
  getTicketById,
  addMessage,
  updateTicketStatus,
  createCallRequest,
  scheduleCallRequest,
  cancelCallRequest,
  rescheduleCallRequest
};
