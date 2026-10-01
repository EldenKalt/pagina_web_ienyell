const PDFDocument = require("pdfkit");
const { ConversationStatus, MessageSender, Role } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { emitToConversation } = require("../utils/messageEvents");
const { createNotification } = require("../utils/notificationHelper");
const { parseBulkIds } = require("../utils/bulkIds");
const { validateAttachmentsField } = require("../utils/attachmentValidator");

const ADMIN_QUICK_REPLIES = [
  "Buenos dias, con gusto le ayudo.",
  "Se registraron las horas en su programa.",
  "Su reporte mensual ya esta disponible.",
  "Le parece bien que coordinemos una llamada?",
  "Quedo atento. Que tenga buen dia."
];

function formatTime(value) {
  return new Date(value).toLocaleTimeString("es-CR", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDay(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Hoy";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Ayer";
  }
  return date.toLocaleDateString("es-CR", { day: "numeric", month: "short" });
}

function initialsOf(name) {
  return String(name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function displayForConversation(conversation) {
  if (conversation.client) {
    return {
      name: conversation.client.name,
      company: conversation.client.company,
      email: conversation.client.email,
      phone: conversation.client.phone
    };
  }

  if (conversation.contactMessage) {
    const contact = conversation.contactMessage;
    return {
      name: `${contact.name}${contact.lastName ? ` ${contact.lastName}` : ""}`,
      company: contact.company,
      email: contact.email,
      phone: contact.phone
    };
  }

  return {
    name: "Contacto",
    company: null,
    email: null,
    phone: null
  };
}

function unreadForRole(conversation, role) {
  return conversation.messages.filter((message) => {
    if (role === Role.ADMIN || role === Role.COLABORADOR) {
      return message.senderType !== MessageSender.ADMIN && message.senderType !== MessageSender.COLABORADOR && !message.readByAdminAt;
    }
    return (message.senderType === MessageSender.ADMIN || message.senderType === MessageSender.COLABORADOR) && !message.readByClientAt;
  }).length;
}

function normalizeMessage(message, role) {
  const mine = (role === Role.ADMIN || role === Role.COLABORADOR)
    ? (message.senderType === MessageSender.ADMIN || message.senderType === MessageSender.COLABORADOR)
    : message.senderType === MessageSender.CLIENT;

  return {
    id: message.id,
    conversationId: message.conversationId,
    from: mine ? "me" : "them",
    senderType: message.senderType,
    body: message.body || "",
    text: message.body || "",
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    day: formatDay(message.createdAt),
    time: formatTime(message.createdAt),
    receipt: mine && (role === Role.ADMIN ? message.readByClientAt : message.readByAdminAt) ? "read" : "sent",
    readByAdminAt: message.readByAdminAt,
    readByClientAt: message.readByClientAt,
    createdAt: message.createdAt
  };
}

function normalizeConversation(conversation, role, includeMessages = false) {
  const display = displayForConversation(conversation);
  const lastMessage = conversation.messages[0] || null;
  const unreadCount = unreadForRole(conversation, role);

  return {
    id: conversation.id,
    clientId: conversation.clientId,
    contactMessageId: conversation.contactMessageId,
    subject: conversation.subject,
    status: conversation.status,
    name: display.name,
    company: display.company,
    email: display.email,
    phone: display.phone,
    initials: initialsOf(display.name),
    online: Boolean(conversation.clientId),
    unreadCount,
    lastMessageAt: conversation.lastMessageAt,
    lastMessage: lastMessage ? normalizeMessage(lastMessage, role) : null,
    assignedAgentId: conversation.assignedAgentId || null,
    assignedAgent: conversation.assignedAgent
      ? { id: conversation.assignedAgent.id, name: conversation.assignedAgent.name, role: conversation.assignedAgent.role }
      : null,
    quickReplies: (role === Role.ADMIN || role === Role.COLABORADOR) ? ADMIN_QUICK_REPLIES : [
      "Cuantas horas me quedan?",
      "Cuando esta listo mi reporte?",
      "Necesito una nueva publicacion.",
      "Muchas gracias por la ayuda."
    ],
    messages: includeMessages
      ? [...conversation.messages]
        .reverse()
        .map((message) => normalizeMessage(message, role))
      : undefined
  };
}

function messagePreview(body, attachments = []) {
  if (body) {
    return body.length > 120 ? `${body.slice(0, 117)}...` : body;
  }
  if (attachments.length) {
    return `Envio ${attachments.length} adjunto${attachments.length === 1 ? "" : "s"}.`;
  }
  return "Envio un mensaje.";
}

async function notifyAgentAboutMessage(conversation, body, attachments) {
  const display = displayForConversation(conversation);

  if (conversation.assignedAgentId) {
    const agent = await prisma.user.findUnique({
      where: { id: conversation.assignedAgentId },
      select: { id: true, role: true }
    });
    if (agent) {
      const linkUrl = agent.role === Role.COLABORADOR
        ? `/colaborador/contact?conversationId=${conversation.id}`
        : `/admin/contact?conversationId=${conversation.id}`;
      await createNotification(agent.id, {
        title: `Nuevo mensaje de ${display.name}`,
        body: messagePreview(body, attachments),
        type: "STATUS_CHANGE",
        linkUrl,
        metadata: { conversationId: conversation.id }
      });
      return;
    }
  }

  if (conversation.clientId) {
    const assignments = await prisma.clientCollaborator.findMany({
      where: { clientId: conversation.clientId },
      include: { collaborator: { select: { id: true, isActive: true } } }
    });
    const activeCollaborators = assignments
      .map((a) => a.collaborator)
      .filter((c) => c?.isActive);

    if (activeCollaborators.length) {
      await Promise.all(activeCollaborators.map((collab) => createNotification(collab.id, {
        title: `Nuevo mensaje de ${display.name}`,
        body: messagePreview(body, attachments),
        type: "STATUS_CHANGE",
        linkUrl: `/colaborador/contact?conversationId=${conversation.id}`,
        metadata: { conversationId: conversation.id }
      })));
      return;
    }
  }

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true }
  });

  await Promise.all(admins.map((admin) => createNotification(admin.id, {
    title: `Nuevo mensaje de ${display.name}`,
    body: messagePreview(body, attachments),
    type: "STATUS_CHANGE",
    linkUrl: `/admin/contact?conversationId=${conversation.id}`,
    metadata: { conversationId: conversation.id }
  })));
}

async function notifyMessageRecipients(conversation, senderType, body, attachments = []) {
  try {
    if (senderType === MessageSender.ADMIN || senderType === MessageSender.COLABORADOR) {
      if (conversation.clientId) {
        await createNotification(conversation.clientId, {
          title: "Nuevo mensaje de Util",
          body: messagePreview(body, attachments),
          type: "STATUS_CHANGE",
          linkUrl: `/dashboard/messages?conversationId=${conversation.id}`,
          metadata: { conversationId: conversation.id }
        });
      }
      return;
    }

    await notifyAgentAboutMessage(conversation, body, attachments);
  } catch (error) {
    console.error("No se pudo crear la notificacion del mensaje:", error.message);
  }
}

async function pickCollaboratorForClient(clientId) {
  const collaborator = await prisma.clientCollaborator.findFirst({
    where: { clientId },
    include: {
      collaborator: {
        select: { id: true, isActive: true, staffAvailability: { select: { status: true } } }
      }
    },
    orderBy: { assignedAt: "asc" }
  });
  return collaborator?.collaborator?.isActive ? collaborator.collaboratorId : null;
}

async function getOrCreateClientConversation(userId) {
  const existing = await prisma.conversation.findFirst({
    where: {
      clientId: userId,
      contactMessageId: null
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (existing) {
    if (!existing.assignedAgentId) {
      const backfillId = await pickCollaboratorForClient(userId);
      if (backfillId) {
        return prisma.conversation.update({
          where: { id: existing.id },
          data: { assignedAgentId: backfillId }
        });
      }
    }
    return existing;
  }

  const assignedAgentId = await pickCollaboratorForClient(userId);

  return prisma.conversation.create({
    data: {
      clientId: userId,
      subject: "Mensajes con Util",
      assignedAgentId
    }
  });
}

async function ensureColaboradorConversations(collaboratorId, clientIds) {
  if (!clientIds.length) return;
  const existing = await prisma.conversation.findMany({
    where: { clientId: { in: clientIds }, contactMessageId: null },
    select: { id: true, clientId: true, assignedAgentId: true }
  });
  const byClient = new Map(existing.map((c) => [c.clientId, c]));

  await Promise.all(clientIds.map(async (clientId) => {
    const current = byClient.get(clientId);
    if (!current) {
      await prisma.conversation.create({
        data: {
          clientId,
          subject: "Mensajes con Util",
          assignedAgentId: collaboratorId
        }
      });
    } else if (!current.assignedAgentId) {
      await prisma.conversation.update({
        where: { id: current.id },
        data: { assignedAgentId: collaboratorId }
      });
    }
  }));
}

async function findConversationForUser(id, user) {
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      client: {
        select: { id: true, name: true, email: true, phone: true, company: true }
      },
      contactMessage: true,
      messages: {
        orderBy: { createdAt: "desc" },
        include: {
          senderUser: {
            select: { id: true, name: true, email: true, role: true }
          }
        }
      }
    }
  });

  if (!conversation) {
    return null;
  }

  if (user.role === Role.ADMIN) {
    return conversation;
  }

  if (conversation.clientId === user.id) {
    return conversation;
  }

  if (user.role === Role.COLABORADOR) {
    if (conversation.assignedAgentId === user.id) {
      return conversation;
    }
    if (conversation.clientId) {
      const assignment = await prisma.clientCollaborator.findUnique({
        where: { clientId_collaboratorId: { clientId: conversation.clientId, collaboratorId: user.id } }
      });
      if (assignment) {
        return conversation;
      }
    }
  }

  return "forbidden";
}

async function listConversations(req, res, next) {
  try {
    if (req.user.role === Role.CLIENT || req.user.role === Role.PROVEEDOR) {
      await getOrCreateClientConversation(req.user.id);
    }

    let where;
    if (req.user.role === Role.ADMIN) {
      if (req.query.showAll === "true") {
        where = {};
      } else {
        const assignedClientIds = await prisma.clientCollaborator.findMany({
          select: { clientId: true }
        }).then((rows) => [...new Set(rows.map((r) => r.clientId))]);

        where = {
          OR: [
            { assignedAgentId: null, clientId: { notIn: assignedClientIds.length ? assignedClientIds : [] } },
            { assignedAgentId: req.user.id },
            { contactMessageId: { not: null } }
          ]
        };
      }
    } else if (req.user.role === Role.COLABORADOR) {
      const myClientIds = await prisma.clientCollaborator.findMany({
        where: { collaboratorId: req.user.id },
        select: { clientId: true }
      }).then((rows) => rows.map((r) => r.clientId));

      await ensureColaboradorConversations(req.user.id, myClientIds);

      where = {
        OR: [
          { assignedAgentId: req.user.id },
          ...(myClientIds.length ? [{ clientId: { in: myClientIds }, assignedAgentId: null }] : [])
        ]
      };
    } else {
      where = { clientId: req.user.id };
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true, company: true }
        },
        contactMessage: true,
        assignedAgent: {
          select: { id: true, name: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    let personalConversationId = null;
    if (req.user.role === Role.COLABORADOR) {
      const personalConv = await getOrCreateClientConversation(req.user.id);
      personalConversationId = personalConv?.id || null;
    }

    return res.json({
      conversations: conversations.map((conversation) => normalizeConversation(conversation, req.user.role)),
      unreadCount: conversations.reduce((sum, conversation) => sum + unreadForRole(conversation, req.user.role), 0),
      personalConversationId
    });
  } catch (error) {
    return next(error);
  }
}

async function getConversation(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Id invalido" });
    }

    const conversation = await findConversationForUser(id, req.user);
    if (!conversation) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }
    if (conversation === "forbidden") {
      return res.status(403).json({ error: "No tienes permiso para esta conversacion" });
    }

    return res.json({
      conversation: normalizeConversation(conversation, req.user.role, true)
    });
  } catch (error) {
    return next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const body = String(req.body?.body || "").trim();
    const attachmentValidation = validateAttachmentsField(req.body?.attachments);
    if (attachmentValidation.error) {
      return res.status(400).json({ error: attachmentValidation.error });
    }
    const attachments = attachmentValidation.attachments;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Id invalido" });
    }
    if (!body && attachments.length === 0) {
      return res.status(400).json({ error: "El mensaje no puede estar vacio" });
    }

    const conversation = await findConversationForUser(id, req.user);
    if (!conversation) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }
    if (conversation === "forbidden") {
      return res.status(403).json({ error: "No tienes permiso para esta conversacion" });
    }

    let senderType;
    if (req.user.role === Role.ADMIN) {
      senderType = MessageSender.ADMIN;
    } else if (req.user.role === Role.COLABORADOR) {
      senderType = MessageSender.COLABORADOR;
    } else {
      senderType = MessageSender.CLIENT;
    }
    const created = await prisma.message.create({
      data: {
        conversationId: id,
        senderType,
        senderUserId: req.user.id,
        body: body || null,
        attachments: attachments.length ? attachments : null,
        readByAdminAt: senderType === MessageSender.ADMIN ? new Date() : null,
        readByClientAt: senderType === MessageSender.CLIENT ? new Date() : null
      }
    });

    const shouldClaimForColaborador = req.user.role === Role.COLABORADOR && !conversation.assignedAgentId;
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        lastMessageAt: created.createdAt,
        status: ConversationStatus.OPEN,
        ...(shouldClaimForColaborador ? { assignedAgentId: req.user.id } : {})
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true, company: true }
        },
        contactMessage: true,
        assignedAgent: {
          select: { id: true, name: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (conversation.contactMessageId && senderType === MessageSender.ADMIN) {
      await prisma.contactMessage.update({
        where: { id: conversation.contactMessageId },
        data: {
          adminReply: body || "[Adjunto]",
          repliedAt: created.createdAt,
          isRead: true
        }
      });
    }

    const payload = {
      conversation: normalizeConversation(updatedConversation, req.user.role),
      message: normalizeMessage(created, req.user.role)
    };
    emitToConversation(updatedConversation, "message:new", payload, req.user.role);
    await notifyMessageRecipients(updatedConversation, senderType, body, attachments);

    return res.status(201).json(payload);
  } catch (error) {
    return next(error);
  }
}

async function markConversationRead(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Id invalido" });
    }

    const conversation = await findConversationForUser(id, req.user);
    if (!conversation) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }
    if (conversation === "forbidden") {
      return res.status(403).json({ error: "No tienes permiso para esta conversacion" });
    }

    const now = new Date();
    const isStaff = req.user.role === Role.ADMIN || req.user.role === Role.COLABORADOR;
    const update = isStaff
      ? {
        where: {
          conversationId: id,
          senderType: { notIn: [MessageSender.ADMIN, MessageSender.COLABORADOR] },
          readByAdminAt: null
        },
        data: { readByAdminAt: now }
      }
      : {
        where: {
          conversationId: id,
          senderType: { in: [MessageSender.ADMIN, MessageSender.COLABORADOR] },
          readByClientAt: null
        },
        data: { readByClientAt: now }
      };

    const result = await prisma.message.updateMany(update);
    if (isStaff && conversation.contactMessageId) {
      await prisma.contactMessage.update({
        where: { id: conversation.contactMessageId },
        data: { isRead: true }
      });
    }

    if (result.count > 0) {
      emitToConversation(conversation, "message:read", {
        conversationId: id,
        role: req.user.role,
        readAt: now
      }, req.user.role);
    }

    return res.json({
      message: "Conversacion marcada como leida",
      updatedCount: result.count
    });
  } catch (error) {
    return next(error);
  }
}

async function setTyping(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const isTyping = Boolean(req.body?.isTyping);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Id invalido" });
    }

    const conversation = await findConversationForUser(id, req.user);
    if (!conversation) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }
    if (conversation === "forbidden") {
      return res.status(403).json({ error: "No tienes permiso para esta conversacion" });
    }

    emitToConversation(conversation, "message:typing", {
      conversationId: id,
      role: req.user.role,
      isTyping
    }, req.user.role);

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

async function exportMarkdown(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const conversation = await findConversationForUser(id, req.user);
    if (!conversation) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }
    if (conversation === "forbidden") {
      return res.status(403).json({ error: "No tienes permiso para esta conversacion" });
    }

    const normalized = normalizeConversation(conversation, req.user.role, true);
    const lines = [
      "# Conversacion - Util",
      "",
      `**Contacto:** ${normalized.name}`,
      `**Empresa:** ${normalized.company || "-"}`,
      `**Exportado:** ${new Date().toLocaleDateString("es-CR")}`,
      "",
      "---",
      ""
    ];

    normalized.messages.forEach((message) => {
      lines.push(`## ${message.day}`);
      lines.push(`**${message.from === "me" ? "Usted" : normalized.name}** - ${message.time}`);
      lines.push(message.text || "");
      message.attachments.forEach((attachment) => {
        lines.push(`> Adjunto: ${attachment.name} (${attachment.size})`);
      });
      lines.push("");
    });

    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="conversacion-${id}.md"`);
    return res.send(lines.join("\n"));
  } catch (error) {
    return next(error);
  }
}

async function exportPdf(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const conversation = await findConversationForUser(id, req.user);
    if (!conversation) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }
    if (conversation === "forbidden") {
      return res.status(403).json({ error: "No tienes permiso para esta conversacion" });
    }

    const normalized = normalizeConversation(conversation, req.user.role, true);
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="conversacion-${id}.pdf"`);
    doc.pipe(res);

    doc.font("Helvetica-Bold").fontSize(22).fillColor("#003366").text("Conversacion - Util");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(11).fillColor("#1F1F1E")
      .text(`Contacto: ${normalized.name}`)
      .text(`Empresa: ${normalized.company || "-"}`)
      .text(`Exportado: ${new Date().toLocaleDateString("es-CR")}`);
    doc.moveDown();

    normalized.messages.forEach((message) => {
      if (doc.y > 720) {
        doc.addPage();
      }
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#6B7280").text(`${message.day} - ${message.time}`);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(message.from === "me" ? "#003366" : "#1F1F1E")
        .text(message.from === "me" ? "Usted" : normalized.name);
      doc.font("Helvetica").fontSize(11).fillColor("#1F1F1E").text(message.text || "[Adjunto]", { width: 495 });
      message.attachments.forEach((attachment) => {
        doc.fontSize(9).fillColor("#4B5563").text(`Adjunto: ${attachment.name} (${attachment.size})`);
      });
      doc.moveDown(0.8);
    });

    doc.end();
  } catch (error) {
    return next(error);
  }
}

async function bulkDeleteMessages(req, res, next) {
  try {
    if (req.user.role !== Role.ADMIN) {
      return res.status(403).json({ error: "No tienes permiso para esta acción" });
    }

    const { ids, error } = parseBulkIds(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const messages = await prisma.message.findMany({
      where: { id: { in: ids } },
      select: { id: true, conversationId: true }
    });
    const conversationIds = [...new Set(messages.map(({ conversationId }) => conversationId))];

    const deleted = await prisma.$transaction(async (tx) => {
      const result = await tx.message.deleteMany({
        where: { id: { in: messages.map(({ id }) => id) } }
      });

      for (const conversationId of conversationIds) {
        const [conversation, lastMessage] = await Promise.all([
          tx.conversation.findUnique({
            where: { id: conversationId },
            select: { createdAt: true }
          }),
          tx.message.findFirst({
            where: { conversationId },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true }
          })
        ]);

        if (conversation) {
          await tx.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: lastMessage?.createdAt || conversation.createdAt }
          });
        }
      }

      return result.count;
    });

    return res.json({ deleted });
  } catch (requestError) {
    return next(requestError);
  }
}

async function transferConversation(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Id invalido" });
    }

    const agentId = req.body.agentId === null ? null : Number.parseInt(req.body.agentId, 10);
    if (req.body.agentId !== null && (!Number.isInteger(agentId) || agentId <= 0)) {
      return res.status(400).json({ error: "agentId invalido" });
    }

    const conversation = await findConversationForUser(id, req.user);
    if (!conversation) {
      return res.status(404).json({ error: "Conversacion no encontrada" });
    }
    if (conversation === "forbidden") {
      return res.status(403).json({ error: "No tienes permiso para esta conversacion" });
    }

    if (agentId) {
      const targetAgent = await prisma.user.findUnique({
        where: { id: agentId },
        select: { id: true, name: true, role: true, isActive: true }
      });
      if (!targetAgent || !targetAgent.isActive || (targetAgent.role !== Role.ADMIN && targetAgent.role !== Role.COLABORADOR)) {
        return res.status(400).json({ error: "Agente destino invalido" });
      }
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { assignedAgentId: agentId },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true, company: true }
        },
        contactMessage: true,
        assignedAgent: {
          select: { id: true, name: true, email: true, role: true }
        },
        messages: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    emitToConversation(updated, "message:transferred", {
      conversationId: id,
      assignedAgentId: agentId,
      conversation: normalizeConversation(updated, req.user.role)
    }, req.user.role);

    return res.json({ conversation: normalizeConversation(updated, req.user.role) });
  } catch (error) {
    return next(error);
  }
}

async function getPersonalConversation(req, res, next) {
  try {
    const personalConv = await getOrCreateClientConversation(req.user.id);
    const conversation = await findConversationForUser(personalConv.id, req.user);
    if (!conversation || conversation === 'forbidden') {
      return res.status(404).json({ error: 'Canal de soporte no encontrado' });
    }
    return res.json({
      conversation: normalizeConversation(conversation, req.user.role, true),
      conversationId: personalConv.id
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listConversations,
  getConversation,
  getPersonalConversation,
  sendMessage,
  markConversationRead,
  setTyping,
  exportMarkdown,
  exportPdf,
  bulkDeleteMessages,
  transferConversation
};
