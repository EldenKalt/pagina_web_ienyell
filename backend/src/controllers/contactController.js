const { MessageSender, Role } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { emitToConversation } = require("../utils/messageEvents");
const { createNotification } = require("../utils/notificationHelper");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const { createAppointmentInNotion } = require("../utils/notionService");
const { parseBulkIds } = require("../utils/bulkIds");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s-]{7,20}$/;
const VALID_BUDGET_PERIODS = new Set(["mensual", "semanal", "por proyecto", "diario"]);
const APPOINTMENT_PATTERN = /\b(cita|citas|agendar|agenda|reuni[oó]n|reunirnos|llamada)\b/i;

function normalizeOptionalString(value) {
  const safeValue = String(value || "").trim();
  return safeValue || null;
}

function parseOptionalDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "invalid";
  }

  return parsed;
}

function formatDateForEmail(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("es-CR");
}

function escapeHtml(unsafe) {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function ensureConversationForContact(contact) {
  const conversation = await prisma.conversation.upsert({
    where: {
      contactMessageId: contact.id
    },
    update: {},
    create: {
      contactMessageId: contact.id,
      subject: `Contacto - ${contact.name}`,
      lastMessageAt: contact.createdAt || new Date()
    }
  });

  const existingInitialMessage = await prisma.message.findFirst({
    where: {
      conversationId: conversation.id,
      senderType: MessageSender.CONTACT
    }
  });

  if (!existingInitialMessage) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: MessageSender.CONTACT,
        body: contact.message,
        createdAt: contact.createdAt || new Date()
      }
    });
  }

  return conversation;
}

async function notifyAdminsOfContact(contact, conversation) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true }
    });

    await Promise.all(admins.map((admin) => createNotification(admin.id, {
      title: `Nuevo mensaje de contacto - ${contact.name}`,
      body: String(contact.message || "").slice(0, 140),
      type: "STATUS_CHANGE",
      linkUrl: `/admin/contact?conversationId=${conversation.id}`,
      metadata: { conversationId: conversation.id }
    })));
  } catch (error) {
    console.error("No se pudo crear la notificacion del contacto:", error.message);
  }
}

async function submitContact(req, res, next) {
  try {
    if ((req.body || {}).attachments !== undefined) {
      return res.status(400).json({ error: "Los adjuntos no están habilitados en contacto público." });
    }

    // Honeypot: bots fill hidden fields, humans leave them empty
    if (String(req.body?.website || "").trim()) {
      return res.status(201).json({ message: "Mensaje enviado correctamente" });
    }

    const {
      name,
      lastName,
      company,
      email,
      phone,
      message,
      deadline,
      deadlineEnd,
      knowsServices,
      productInterest,
      budgetMin,
      budgetMax,
      budgetPeriod,
      isUrgent,
      wantsCustomService,
      serviceCategories,
      suggestedService
    } = req.body || {};

    const safeName = String(name || "").trim();
    const safeEmail = String(email || "").trim().toLowerCase();
    const safePhone = String(phone || "").trim();
    const safeMessage = String(message || "").trim();
    const safeLastName = normalizeOptionalString(lastName);
    const safeCompany = normalizeOptionalString(company);
    const safeProductInterest = normalizeOptionalString(productInterest);
    const safeSuggestedService = normalizeOptionalString(suggestedService);
    const safeServiceCategories = Array.isArray(serviceCategories)
      ? serviceCategories.map((c) => String(c).trim()).filter(Boolean).slice(0, 10).join(",")
      : normalizeOptionalString(serviceCategories);
    const parsedDeadline = parseOptionalDate(deadline);
    const parsedDeadlineEnd = parseOptionalDate(deadlineEnd);
    const hasBudgetMin = budgetMin !== undefined && String(budgetMin).trim() !== "";
    const hasBudgetMax = budgetMax !== undefined && String(budgetMax).trim() !== "";
    const parsedBudgetMin = hasBudgetMin ? Number(budgetMin) : null;
    const parsedBudgetMax = hasBudgetMax ? Number(budgetMax) : null;
    const normalizedBudgetPeriod = normalizeOptionalString(budgetPeriod)?.toLowerCase() || null;

    if (!safeName || !safeEmail || !safePhone || !safeMessage) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    if (!EMAIL_REGEX.test(safeEmail)) {
      return res.status(400).json({ error: "El correo electronico no es valido" });
    }

    if (!PHONE_REGEX.test(safePhone)) {
      return res.status(400).json({ error: "El telefono no tiene un formato valido" });
    }

    if (safeMessage.length < 20) {
      return res.status(400).json({ error: "El mensaje debe tener al menos 20 caracteres" });
    }

    if (parsedDeadline === "invalid") {
      return res.status(400).json({ error: "deadline debe ser una fecha valida" });
    }

    if (parsedDeadlineEnd === "invalid") {
      return res.status(400).json({ error: "deadlineEnd debe ser una fecha valida" });
    }

    if (parsedDeadline && parsedDeadlineEnd && parsedDeadlineEnd < parsedDeadline) {
      return res.status(400).json({ error: "deadlineEnd no puede ser menor que deadline" });
    }

    if (knowsServices !== undefined && knowsServices !== null && typeof knowsServices !== "boolean") {
      return res.status(400).json({ error: "knowsServices debe ser booleano" });
    }

    if (isUrgent !== undefined && isUrgent !== null && typeof isUrgent !== "boolean") {
      return res.status(400).json({ error: "isUrgent debe ser booleano" });
    }

    if (knowsServices === true && !safeProductInterest) {
      return res.status(400).json({ error: "productInterest es requerido cuando conoce los servicios" });
    }

    if (hasBudgetMin && !Number.isFinite(parsedBudgetMin)) {
      return res.status(400).json({ error: "budgetMin debe ser numerico" });
    }

    if (hasBudgetMax && !Number.isFinite(parsedBudgetMax)) {
      return res.status(400).json({ error: "budgetMax debe ser numerico" });
    }

    if (parsedBudgetMin !== null && parsedBudgetMax !== null && parsedBudgetMax < parsedBudgetMin) {
      return res.status(400).json({ error: "budgetMax no puede ser menor que budgetMin" });
    }

    if (normalizedBudgetPeriod && !VALID_BUDGET_PERIODS.has(normalizedBudgetPeriod)) {
      return res.status(400).json({ error: "budgetPeriod no es valido" });
    }

    const savedMessage = await prisma.contactMessage.create({
      data: {
        name: safeName,
        lastName: safeLastName,
        company: safeCompany,
        email: safeEmail,
        phone: safePhone,
        message: safeMessage,
        deadline: parsedDeadline || null,
        deadlineEnd: parsedDeadlineEnd || null,
        knowsServices: typeof knowsServices === "boolean" ? knowsServices : null,
        productInterest: knowsServices === true ? safeProductInterest : null,
        budgetMin: parsedBudgetMin,
        budgetMax: parsedBudgetMax,
        budgetPeriod: normalizedBudgetPeriod,
        isUrgent: typeof isUrgent === "boolean" ? isUrgent : null,
        wantsCustomService: wantsCustomService === true,
        serviceCategories: safeServiceCategories || null,
        suggestedService: safeSuggestedService || null
      }
    });
    const conversation = await ensureConversationForContact(savedMessage);
    emitToConversation(conversation, "message:new", {
      conversationId: conversation.id
    }, "CONTACT");
    await notifyAdminsOfContact(savedMessage, conversation);

    if (APPOINTMENT_PATTERN.test(safeMessage)) {
      await createAppointmentInNotion({
        name: [safeName, safeLastName].filter(Boolean).join(" "),
        email: safeEmail,
        phone: safePhone,
        date: parsedDeadline || savedMessage.createdAt,
        status: "Pendiente"
      });
    }

    await sendEmail({
      to: process.env.ADMIN_EMAIL || "hola@ienyell.com",
      subject: `Nuevo mensaje de contacto - ${safeName}`,
      html: renderEmailLayout({
        title: "Nuevo mensaje de contacto",
        contentHtml: `
          <p><strong>Nombre:</strong> ${escapeHtml(safeName)}</p>
          <p><strong>Apellido:</strong> ${escapeHtml(safeLastName || "-")}</p>
          <p><strong>Empresa:</strong> ${escapeHtml(safeCompany || "-")}</p>
          <p><strong>Email:</strong> ${escapeHtml(safeEmail)}</p>
          <p><strong>Telefono:</strong> ${escapeHtml(safePhone)}</p>
          <p><strong>Fecha requerida:</strong> ${formatDateForEmail(parsedDeadline)}</p>
          <p><strong>Fecha fin:</strong> ${formatDateForEmail(parsedDeadlineEnd)}</p>
          <p><strong>Servicio a medida:</strong> ${wantsCustomService ? "Sí" : "No"}</p>
          <p><strong>Categorías:</strong> ${escapeHtml(safeServiceCategories || "-")}</p>
          <p><strong>Servicio sugerido:</strong> ${escapeHtml(safeSuggestedService || "-")}</p>
          <p><strong>Conoce servicios:</strong> ${knowsServices === null || knowsServices === undefined ? "-" : (knowsServices ? "Si" : "No")}</p>
          <p><strong>Interes:</strong> ${escapeHtml(safeProductInterest || "-")}</p>
          <p><strong>Presupuesto:</strong> ${parsedBudgetMin !== null || parsedBudgetMax !== null ? `${parsedBudgetMin ?? "-"} - ${parsedBudgetMax ?? "-"}${normalizedBudgetPeriod ? ` (${escapeHtml(normalizedBudgetPeriod)})` : ""}` : "-"}</p>
          <p><strong>Urgencia:</strong> ${isUrgent === null || isUrgent === undefined ? "-" : (isUrgent ? "Urgente" : "Tengo flexibilidad")}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="white-space: pre-line;">${escapeHtml(safeMessage)}</p>
          <p style="margin-top:24px; color:#6B7280;">Registro ID: ${savedMessage.id}</p>
        `
      })
    });

    return res.status(201).json({ message: "Mensaje enviado correctamente" });
  } catch (error) {
    return next(error);
  }
}

async function bulkDeleteContacts(req, res, next) {
  try {
    const { ids, error } = parseBulkIds(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const conversations = await tx.conversation.findMany({
        where: { contactMessageId: { in: ids } },
        select: { id: true }
      });
      const conversationIds = conversations.map(({ id }) => id);

      if (conversationIds.length) {
        await tx.message.deleteMany({ where: { conversationId: { in: conversationIds } } });
        await tx.conversation.deleteMany({ where: { id: { in: conversationIds } } });
      }

      const result = await tx.contactMessage.deleteMany({ where: { id: { in: ids } } });
      return result.count;
    });

    return res.json({ deleted });
  } catch (requestError) {
    return next(requestError);
  }
}

async function getContacts(req, res, next) {
  try {
    const contacts = await prisma.contactMessage.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json(contacts);
  } catch (error) {
    return next(error);
  }
}

async function markContactAsRead(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Id invalido" });
    }

    const existing = await prisma.contactMessage.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    const contact = await prisma.contactMessage.update({
      where: { id },
      data: {
        isRead: true
      }
    });


    return res.json({
      message: "Mensaje marcado como leido",
      contact
    });
  } catch (error) {
    return next(error);
  }
}

async function replyToContact(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const reply = String(req.body?.reply || "").trim();

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Id invalido" });
    }

    if (!reply) {
      return res.status(400).json({ error: "La respuesta no puede estar vacia" });
    }

    const existing = await prisma.contactMessage.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    const repliedAt = new Date();
    const contact = await prisma.contactMessage.update({
      where: { id },
      data: {
        adminReply: reply,
        repliedAt,
        isRead: true
      }
    });

    await sendEmail({
      to: existing.email,
      subject: "Re: Nuevo mensaje de contacto - Util",
      html: renderEmailLayout({
        title: "Respuesta de Util",
        contentHtml: `
          <p>Hola ${escapeHtml(existing.name)},</p>
          <p>Gracias por escribirnos. Esta es nuestra respuesta a su consulta:</p>
          <div style="padding:16px; border-left:4px solid #F5C025; background:#FEF7DE; white-space:pre-line;">
            ${escapeHtml(reply)}
          </div>
          <h3 style="color:#003366; margin-top:24px;">Su mensaje original</h3>
          <div style="padding:16px; border:1px solid #D1D5DB; background:#F8FAFC;">
            <p><strong>Nombre:</strong> ${escapeHtml(existing.name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(existing.email)}</p>
            <p><strong>Telefono:</strong> ${escapeHtml(existing.phone)}</p>
            <p style="white-space: pre-line;"><strong>Mensaje:</strong><br />${escapeHtml(existing.message)}</p>
          </div>
        `
      })
    });

    return res.json({
      message: "Respuesta enviada",
      contact
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  submitContact,
  bulkDeleteContacts,
  getContacts,
  markContactAsRead,
  replyToContact
};
