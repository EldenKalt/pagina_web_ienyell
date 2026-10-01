const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const sharp = require("sharp");
const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { syncClientToNotion } = require("../utils/notionService");
const { parseBulkIds } = require("../utils/bulkIds");
const SALT_ROUNDS = 12;
const ALLOWED_PROFILE_FIELDS = ["name", "phone", "company"];
const ALLOWED_CLIENT_UPDATE_FIELDS = ["name", "email", "phone", "company", "role", "enabledFeatures", "onvoSubAccountId"];
const MANAGEABLE_ROLES = ["CLIENT", "COLABORADOR", "PROVEEDOR"];

function serializeProfile(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    company: user.company,
    role: user.role,
    discountTier: user.discountTier,
    products: user.products || []
  };
}

function discountTierForRating(rating) {
  if (rating === null || rating === 0) {
    return null;
  }
  if (rating <= 2) {
    return "bronze";
  }
  if (rating === 3) {
    return "silver";
  }
  return "gold";
}

function normalizeClientTags(tags) {
  const uniqueTags = new Map();

  tags.forEach((tag) => {
    const normalized = tag.trim();
    if (normalized) {
      const key = normalized.toLocaleLowerCase("es");
      if (!uniqueTags.has(key)) {
        uniqueTags.set(key, normalized);
      }
    }
  });

  return [...uniqueTags.values()];
}

function parseClientId(value) {
  const clientId = Number.parseInt(value, 10);
  return Number.isInteger(clientId) && clientId > 0 ? clientId : null;
}

function sanitizeFilenamePart(value) {
  return String(value || "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "cliente";
}

function formatHistoryDate(value, includeTime = false) {
  return new Date(value).toLocaleString("es-CR", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" });
}

function ticketStatusLabel(status) {
  return {
    OPEN: "ABIERTO",
    IN_PROGRESS: "EN PROGRESO",
    CLOSED: "CERRADO"
  }[status] || status;
}

async function deleteClientNotes(tx, userIds) {
  return tx.$executeRaw`
    DELETE FROM "ClientNote"
    WHERE "clientId" IN (${Prisma.join(userIds)})
       OR "updatedById" IN (${Prisma.join(userIds)})
  `;
}

async function deleteDiscountAndReferralData(tx, userIds) {
  const [sentReferrals, createdCodes] = await Promise.all([
    tx.referral.findMany({
      where: { referrerId: { in: userIds } },
      select: { rewardCodeId: true }
    }),
    tx.discountCode.findMany({
      where: { createdById: { in: userIds } },
      select: { id: true }
    })
  ]);

  const rewardCodeIds = sentReferrals
    .map(({ rewardCodeId }) => rewardCodeId)
    .filter(Boolean);
  const createdCodeIds = createdCodes.map(({ id }) => id);
  const codeIds = [...new Set([...rewardCodeIds, ...createdCodeIds])];

  await tx.referral.deleteMany({
    where: { referrerId: { in: userIds } }
  });
  await tx.referral.updateMany({
    where: { referredId: { in: userIds } },
    data: { referredId: null }
  });
  await tx.discountUsage.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        ...(codeIds.length ? [{ codeId: { in: codeIds } }] : [])
      ]
    }
  });

  if (createdCodeIds.length) {
    await tx.referral.updateMany({
      where: { rewardCodeId: { in: createdCodeIds } },
      data: { rewardCodeId: null }
    });
  }
  if (codeIds.length) {
    await tx.discountCode.deleteMany({
      where: { id: { in: codeIds } }
    });
  }
}

async function findClientWithTicketHistory(clientId) {
  return prisma.user.findFirst({
    where: {
      id: clientId,
      role: "CLIENT"
    },
    select: {
      id: true,
      name: true,
      email: true,
      tickets: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          subject: true,
          status: true,
          createdAt: true,
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              body: true,
              createdAt: true,
              sender: {
                select: {
                  name: true,
                  role: true
                }
              }
            }
          }
        }
      }
    }
  });
}

async function resolveHistoryClient(req, res) {
  const requestedClientId = req.params.clientId
    ? parseClientId(req.params.clientId)
    : req.user.id;

  if (!requestedClientId) {
    res.status(400).json({ error: "ID de cliente inválido" });
    return null;
  }

  const client = await findClientWithTicketHistory(requestedClientId);
  if (!client) {
    res.status(404).json({ error: "Cliente no encontrado" });
    return null;
  }

  return client;
}

async function createHistoryLogo() {
  const logoPath = path.resolve(__dirname, "../../../assets/logotipo_util_yellow_dark.svg");
  const logoSvgBuffer = fs.readFileSync(logoPath);
  return sharp(logoSvgBuffer)
    .resize({ height: 56 })
    .png()
    .toBuffer();
}

async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        products: {
          include: {
            product: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    return res.json(serializeProfile(user));
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const payload = req.body || {};
    const keys = Object.keys(payload);
    const invalidFields = keys.filter((key) => !ALLOWED_PROFILE_FIELDS.includes(key));

    if (invalidFields.length) {
      return res.status(400).json({ error: "Solo se permite actualizar name, phone y company" });
    }

    if (!keys.length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, "name")) {
      const name = String(payload.name || "").trim();
      if (!name) {
        return res.status(400).json({ error: "El nombre es obligatorio" });
      }
      data.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "phone")) {
      const phoneValue = payload.phone === null || payload.phone === ""
        ? null
        : String(payload.phone).trim();
      data.phone = phoneValue;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "company")) {
      const company = payload.company === null || payload.company === ""
        ? null
        : String(payload.company).trim();
      data.company = company;
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: {
        products: {
          include: {
            product: true
          }
        }
      }
    });

    if (updated.role === "CLIENT") {
      await syncClientToNotion({
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        company: updated.company,
        active: true
      });
    }

    return res.json(serializeProfile(updated));
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword y newPassword son requeridos" });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        passwordHash: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isValidCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash }
    });

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    return next(error);
  }
}

async function deactivateAccount(req, res, next) {
  try {
    const pendingInstallments = await prisma.installment.count({
      where: {
        installmentPlan: { clientId: req.user.id },
        status: { in: ["PENDING", "OVERDUE"] }
      }
    });
    if (pendingInstallments > 0) {
      return res.status(403).json({
        error: "No puede desactivar su cuenta mientras tenga cuotas de pago pendientes.",
        code: "OUTSTANDING_DEBT"
      });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isActive: false }
    });

    return res.json({
      deactivated: true,
      message: "Cuenta desactivada. Podés reactivarla contactando al admin."
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const pendingInstallments = await prisma.installment.count({
      where: {
        installmentPlan: { clientId: req.user.id },
        status: { in: ["PENDING", "OVERDUE"] }
      }
    });
    if (pendingInstallments > 0) {
      return res.status(403).json({
        error: "No puede eliminar su cuenta mientras tenga cuotas de pago pendientes. Complete o cancele sus planes de cuotas primero.",
        code: "OUTSTANDING_DEBT"
      });
    }

    const password = String(req.body?.password || "");
    if (!password) {
      return res.status(400).json({ error: "La contraseña es requerida" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        passwordHash: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordIsValid) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    await prisma.$transaction(async (tx) => {
      const [ownedTicketIds, ownedClientProductIds, ownedConversationIds] = await Promise.all([
        tx.ticket.findMany({
          where: { clientId: user.id },
          select: { id: true }
        }),
        tx.clientProduct.findMany({
          where: { clientId: user.id },
          select: { id: true }
        }),
        tx.conversation.findMany({
          where: { clientId: user.id },
          select: { id: true }
        })
      ]);

      const ticketIds = ownedTicketIds.map(({ id }) => id);
      const clientProductIds = ownedClientProductIds.map(({ id }) => id);
      const conversationIds = ownedConversationIds.map(({ id }) => id);

      await tx.ticketCallRequest.deleteMany({
        where: {
          OR: [
            { requestedById: user.id },
            ...(ticketIds.length ? [{ ticketId: { in: ticketIds } }] : [])
          ]
        }
      });

      await tx.ticketMessage.deleteMany({
        where: {
          OR: [
            { senderId: user.id },
            ...(ticketIds.length ? [{ ticketId: { in: ticketIds } }] : [])
          ]
        }
      });

      if (ticketIds.length) {
        await tx.ticket.deleteMany({ where: { id: { in: ticketIds } } });
      }

      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.order.deleteMany({ where: { clientId: user.id } });
      await tx.hourBooking.deleteMany({ where: { clientId: user.id } });

      await tx.hourEntry.deleteMany({
        where: {
          OR: [
            { registeredById: user.id },
            ...(clientProductIds.length ? [{ clientProductId: { in: clientProductIds } }] : [])
          ]
        }
      });

      if (clientProductIds.length) {
        await tx.clientProduct.deleteMany({ where: { id: { in: clientProductIds } } });
      }

      await tx.message.deleteMany({
        where: {
          OR: [
            { senderUserId: user.id },
            ...(conversationIds.length ? [{ conversationId: { in: conversationIds } }] : [])
          ]
        }
      });

      if (conversationIds.length) {
        await tx.conversation.deleteMany({ where: { id: { in: conversationIds } } });
      }

      await deleteClientNotes(tx, [user.id]);
      await tx.blogPost.deleteMany({ where: { authorId: user.id } });
      await deleteDiscountAndReferralData(tx, [user.id]);
      await tx.project.deleteMany({ where: { clientId: user.id } });

      await tx.user.delete({ where: { id: user.id } });
    });

    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
}

async function deleteClientData(tx, clientIds) {
  const [tickets, clientProducts, conversations] = await Promise.all([
    tx.ticket.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } }),
    tx.clientProduct.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } }),
    tx.conversation.findMany({ where: { clientId: { in: clientIds } }, select: { id: true } })
  ]);

  const ticketIds = tickets.map(({ id }) => id);
  const clientProductIds = clientProducts.map(({ id }) => id);
  const conversationIds = conversations.map(({ id }) => id);

  await tx.ticketCallRequest.deleteMany({
    where: {
      OR: [
        { requestedById: { in: clientIds } },
        ...(ticketIds.length ? [{ ticketId: { in: ticketIds } }] : [])
      ]
    }
  });
  await tx.ticketMessage.deleteMany({
    where: {
      OR: [
        { senderId: { in: clientIds } },
        ...(ticketIds.length ? [{ ticketId: { in: ticketIds } }] : [])
      ]
    }
  });
  if (ticketIds.length) {
    await tx.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  }

  await tx.notification.deleteMany({ where: { userId: { in: clientIds } } });
  await tx.order.deleteMany({ where: { clientId: { in: clientIds } } });
  await tx.hourBooking.deleteMany({ where: { clientId: { in: clientIds } } });
  await tx.hourEntry.deleteMany({
    where: {
      OR: [
        { registeredById: { in: clientIds } },
        ...(clientProductIds.length ? [{ clientProductId: { in: clientProductIds } }] : [])
      ]
    }
  });
  if (clientProductIds.length) {
    await tx.clientProduct.deleteMany({ where: { id: { in: clientProductIds } } });
  }

  await tx.message.deleteMany({
    where: {
      OR: [
        { senderUserId: { in: clientIds } },
        ...(conversationIds.length ? [{ conversationId: { in: conversationIds } }] : [])
      ]
    }
  });
  if (conversationIds.length) {
    await tx.conversation.deleteMany({ where: { id: { in: conversationIds } } });
  }

  await deleteClientNotes(tx, clientIds);
  await deleteDiscountAndReferralData(tx, clientIds);
  await tx.project.deleteMany({ where: { clientId: { in: clientIds } } });

  return tx.user.deleteMany({
    where: {
      id: { in: clientIds },
      role: "CLIENT"
    }
  });
}

async function bulkDeleteClients(req, res, next) {
  try {
    const { ids, error } = parseBulkIds(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const clients = await prisma.user.findMany({
      where: { id: { in: ids }, role: "CLIENT" },
      select: { id: true }
    });
    const clientIds = clients.map(({ id }) => id);

    if (!clientIds.length) {
      return res.json({ deleted: 0 });
    }

    const result = await prisma.$transaction((tx) => deleteClientData(tx, clientIds));
    return res.json({ deleted: result.count });
  } catch (requestError) {
    return next(requestError);
  }
}

async function getMessagesHistory(req, res, next) {
  try {
    const client = await resolveHistoryClient(req, res);
    if (!client) {
      return undefined;
    }

    return res.json({ tickets: client.tickets });
  } catch (error) {
    return next(error);
  }
}

async function downloadMessagesHistoryPdf(req, res, next) {
  try {
    const client = await resolveHistoryClient(req, res);
    if (!client) {
      return undefined;
    }

    const logoBuffer = await createHistoryLogo();
    const generatedAt = new Date();
    const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
    const filename = `historial-mensajes-${sanitizeFilenamePart(client.name)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.image(logoBuffer, 50, 38, { height: 56 });
    doc
      .font("Helvetica-Bold")
      .fontSize(21)
      .fillColor("#003366")
      .text("Historial de conversaciones", 180, 46);
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor("#1F1F1E")
      .text(`Cliente: ${client.name}`, 180, 78)
      .text(`Generado: ${formatHistoryDate(generatedAt, true)}`, 180, 94);

    doc.moveTo(50, 125).lineTo(545, 125).strokeColor("#D9E2EC").stroke();
    doc.y = 145;

    if (!client.tickets.length) {
      doc
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#4B5563")
        .text("Aún no hay mensajes en este historial.");
    }

    client.tickets.forEach((ticket) => {
      if (doc.y > 680) {
        doc.addPage();
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#003366")
        .text(`Ticket #${ticket.id}: ${ticket.subject}`);
      doc
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .fillColor("#D92D20")
        .text(`${ticketStatusLabel(ticket.status)} · ${formatHistoryDate(ticket.createdAt)}`);
      doc.moveDown(0.6);

      if (!ticket.messages.length) {
        doc.font("Helvetica-Oblique").fontSize(10).fillColor("#6B7280").text("Sin mensajes.");
      }

      ticket.messages.forEach((message) => {
        if (doc.y > 735) {
          doc.addPage();
        }
        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor(message.sender.role === "ADMIN" ? "#003366" : "#1F1F1E")
          .text(`[${formatHistoryDate(message.createdAt, true)}] ${message.sender.name}:`);
        doc
          .font("Helvetica")
          .fontSize(10.5)
          .fillColor("#1F1F1E")
          .text(message.body, { width: 495 });
        doc.moveDown(0.45);
      });

      doc.moveDown(0.9);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#E5E7EB").stroke();
      doc.moveDown(1);
    });

    const footer = `Historial generado el ${formatHistoryDate(generatedAt, true)} — ienyell · ienyell.com`;
    const addFooter = () => {
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#6B7280")
        .text(footer, 50, 778, { align: "center", width: 495 });
    };

    for (let pageIndex = 0; pageIndex < doc.bufferedPageRange().count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      addFooter();
    }

    doc.end();
    return undefined;
  } catch (error) {
    return next(error);
  }
}

async function getClients(req, res, next) {
  try {
    const search = String(req.query.search || "").trim();
    const status = req.query.status ? String(req.query.status).toUpperCase() : null;
    const role = req.query.role ? String(req.query.role).toUpperCase() : undefined;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));

    if (status && !["ACTIVE", "PAUSED"].includes(status)) {
      return res.status(400).json({ error: "status debe ser ACTIVE o PAUSED" });
    }
    if (role && !["CLIENT", "COLABORADOR", "PROVEEDOR", "ADMIN"].includes(role)) {
      return res.status(400).json({ error: "role inválido" });
    }

    const where = role
      ? { role }
      : { role: { in: MANAGEABLE_ROLES } };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } }
      ];
    }

    if (status) {
      where.products = {
        some: { status }
      };
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          products: {
            include: {
              product: true,
              hourEntries: {
                orderBy: { date: "desc" },
                take: 1
              }
            }
          }
        }
      })
    ]);

    const clientIds = users.map(({ id }) => id);
    const noteRows = clientIds.length
      ? await prisma.$queryRaw`
          SELECT "clientId", COUNT(*)::int AS "count"
          FROM "ClientNote"
          WHERE "clientId" IN (${Prisma.join(clientIds)})
            AND LENGTH(BTRIM("content")) > 0
          GROUP BY "clientId"
        `
      : [];
    const noteCounts = new Map(noteRows.map((note) => [note.clientId, note.count]));

    const clients = users.map((client) => {
      const lastActivityDate = client.products.reduce((latest, contract) => {
        const contractDate = new Date(contract.startDate);
        const hourDate = contract.hourEntries[0]?.date ? new Date(contract.hourEntries[0].date) : null;
        const candidate = hourDate && hourDate > contractDate ? hourDate : contractDate;
        return candidate > latest ? candidate : latest;
      }, new Date(0));

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        company: client.company,
        role: client.role,
        enabledFeatures: client.enabledFeatures || [],
        onvoSubAccountId: client.onvoSubAccountId,
        assignedAgentId: client.assignedAgentId,
        createdAt: client.createdAt,
        tags: client.tags,
        rating: client.rating,
        discountTier: client.discountTier,
        _count: {
          note: noteCounts.get(client.id) || 0
        },
        products: client.products.map((contract) => ({
          id: contract.id,
          status: contract.status,
          totalHours: contract.totalHours,
          hoursUsed: contract.hoursUsed,
          startDate: contract.startDate,
          renewalDate: contract.renewalDate,
          price: contract.price,
          product: contract.product
        })),
        lastActivity: lastActivityDate.getTime() ? lastActivityDate.toISOString() : null
      };
    });

    return res.json({
      clients,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    return next(error);
  }
}

async function createClient(req, res, next) {
  try {
    const {
      name,
      email,
      password,
      phone,
      company,
      clientProductId,
      productId,
      role: rawRole,
      enabledFeatures,
      onvoSubAccountId
    } = req.body || {};
    const trimmedName = String(name || "").trim();
    const trimmedEmail = String(email || "").trim().toLowerCase();
    const trimmedCompany = String(company || "").trim();
    const trimmedPhone = phone ? String(phone).trim() : null;
    const role = rawRole ? String(rawRole).toUpperCase() : "CLIENT";

    if (!trimmedName || !trimmedEmail || !password || !trimmedCompany) {
      return res.status(400).json({ error: "name, email, password y company son requeridos" });
    }
    if (!MANAGEABLE_ROLES.includes(role)) {
      return res.status(400).json({ error: "role inválido" });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }
    if (enabledFeatures !== undefined && !Array.isArray(enabledFeatures)) {
      return res.status(400).json({ error: "enabledFeatures debe ser un array" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true }
    });

    if (existingUser) {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const requestedProductId = Number(productId || clientProductId || 0);

    let createdUser;
    await prisma.$transaction(async (tx) => {
      createdUser = await tx.user.create({
        data: {
          name: trimmedName,
          email: trimmedEmail,
          passwordHash,
          role,
          phone: trimmedPhone,
          company: trimmedCompany,
          enabledFeatures: role === "COLABORADOR" ? (enabledFeatures || []) : [],
          onvoSubAccountId: role === "PROVEEDOR"
            ? (String(onvoSubAccountId || "").trim() || null)
            : null
        }
      });

      if (role === "CLIENT" && Number.isInteger(requestedProductId) && requestedProductId > 0) {
        const product = await tx.product.findUnique({
          where: { id: requestedProductId }
        });

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        await tx.clientProduct.create({
          data: {
            clientId: createdUser.id,
            productId: product.id,
            status: "ACTIVE",
            totalHours: null,
            hoursUsed: 0,
            startDate: new Date(),
            renewalDate: null,
            price: product.launchPrice
          }
        });
      }
    });

    if (createdUser.role === "CLIENT") {
      await syncClientToNotion({
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        company: createdUser.company,
        active: true
      });
    }

    return res.status(201).json({
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      phone: createdUser.phone,
      company: createdUser.company,
      role: createdUser.role,
      enabledFeatures: createdUser.enabledFeatures || [],
      onvoSubAccountId: createdUser.onvoSubAccountId
    });
  } catch (error) {
    if (error?.message === "PRODUCT_NOT_FOUND") {
      return res.status(400).json({ error: "El producto inicial no existe" });
    }
    return next(error);
  }
}

async function updateClient(req, res, next) {
  try {
    const clientId = parseInt(req.params.id, 10);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ error: "ID de cliente inválido" });
    }

    const payload = req.body || {};
    const keys = Object.keys(payload);
    const invalidFields = keys.filter((key) => !ALLOWED_CLIENT_UPDATE_FIELDS.includes(key));

    if (invalidFields.length) {
      return res.status(400).json({ error: "Solo se permite actualizar name, email, phone, company, role, enabledFeatures y onvoSubAccountId" });
    }

    if (!keys.length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, "name")) {
      const name = String(payload.name || "").trim();
      if (!name) {
        return res.status(400).json({ error: "El nombre es obligatorio" });
      }
      data.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "email")) {
      const email = String(payload.email || "").trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ error: "El correo es obligatorio" });
      }
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== clientId) {
        return res.status(409).json({ error: "El correo ya está registrado" });
      }
      data.email = email;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "phone")) {
      data.phone = payload.phone ? String(payload.phone).trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "company")) {
      const company = String(payload.company || "").trim();
      if (!company) {
        return res.status(400).json({ error: "La empresa es obligatoria" });
      }
      data.company = company;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "role")) {
      const role = String(payload.role || "").toUpperCase();
      if (!MANAGEABLE_ROLES.includes(role)) {
        return res.status(400).json({ error: "role inválido" });
      }
      data.role = role;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "enabledFeatures")) {
      if (!Array.isArray(payload.enabledFeatures)) {
        return res.status(400).json({ error: "enabledFeatures debe ser un array" });
      }
      data.enabledFeatures = payload.enabledFeatures;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "onvoSubAccountId")) {
      data.onvoSubAccountId = payload.onvoSubAccountId
        ? String(payload.onvoSubAccountId).trim()
        : null;
    }

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, role: true }
    });
    if (!client || !MANAGEABLE_ROLES.includes(client.role)) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const nextRole = data.role || client.role;
    if (nextRole !== "COLABORADOR" && !Object.prototype.hasOwnProperty.call(payload, "enabledFeatures")) {
      data.enabledFeatures = [];
    }
    if (nextRole !== "PROVEEDOR" && !Object.prototype.hasOwnProperty.call(payload, "onvoSubAccountId")) {
      data.onvoSubAccountId = null;
    }
    if (nextRole === "COLABORADOR" && !Object.prototype.hasOwnProperty.call(payload, "enabledFeatures")) {
      data.enabledFeatures = client.role === "COLABORADOR" ? undefined : [];
    }
    if (data.enabledFeatures === undefined) {
      delete data.enabledFeatures;
    }

    const updated = await prisma.user.update({
      where: { id: clientId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        role: true,
        enabledFeatures: true,
        onvoSubAccountId: true
      }
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function updateClientMeta(req, res, next) {
  try {
    const clientId = parseClientId(req.params.clientId);
    if (!clientId) {
      return res.status(400).json({ error: "ID de cliente inválido" });
    }

    const payload = req.body || {};
    const keys = Object.keys(payload);
    const invalidFields = keys.filter((key) => !["tags", "rating"].includes(key));

    if (invalidFields.length) {
      return res.status(400).json({ error: "Solo se permite actualizar tags y rating" });
    }
    if (!keys.length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const data = {};

    if (Object.prototype.hasOwnProperty.call(payload, "tags")) {
      if (!Array.isArray(payload.tags) || payload.tags.some((tag) => typeof tag !== "string")) {
        return res.status(400).json({ error: "tags debe ser un arreglo de strings" });
      }
      data.tags = normalizeClientTags(payload.tags);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "rating")) {
      if (payload.rating !== null && (!Number.isInteger(payload.rating) || payload.rating < 0 || payload.rating > 5)) {
        return res.status(400).json({ error: "rating debe ser un entero entre 0 y 5 o null" });
      }
      data.rating = payload.rating;
      data.discountTier = discountTierForRating(payload.rating);
    }

    const client = await prisma.user.findFirst({
      where: {
        id: clientId,
        role: "CLIENT"
      },
      select: { id: true }
    });

    if (!client) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const updated = await prisma.user.update({
      where: { id: clientId },
      data,
      select: {
        id: true,
        tags: true,
        rating: true,
        discountTier: true
      }
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function assignAgent(req, res, next) {
  try {
    const clientId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({ error: "ID de cliente inválido" });
    }
    const { agentId } = req.body || {};
    const parsedAgentId = agentId ? Number.parseInt(agentId, 10) : null;

    if (parsedAgentId !== null && (!Number.isInteger(parsedAgentId) || parsedAgentId <= 0)) {
      return res.status(400).json({ error: "agentId inválido" });
    }

    const client = await prisma.user.findUnique({ where: { id: clientId }, select: { id: true, role: true } });
    if (!client || client.role !== "CLIENT") {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    if (parsedAgentId) {
      const agent = await prisma.user.findUnique({ where: { id: parsedAgentId }, select: { id: true, role: true } });
      if (!agent || (agent.role !== "ADMIN" && agent.role !== "COLABORADOR")) {
        return res.status(400).json({ error: "El agente debe ser ADMIN o COLABORADOR" });
      }
    }

    const updated = await prisma.user.update({
      where: { id: clientId },
      data: { assignedAgentId: parsedAgentId },
      select: { id: true, name: true, assignedAgentId: true }
    });

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deactivateAccount,
  deleteAccount,
  getMessagesHistory,
  downloadMessagesHistoryPdf,
  bulkDeleteClients,
  getClients,
  createClient,
  updateClient,
  updateClientMeta,
  assignAgent
};
