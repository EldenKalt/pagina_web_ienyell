const { AvailStatus, ContractStatus, NotifType } = require("@prisma/client");
const { createNotification } = require("../utils/notificationHelper");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const { triggerN8n } = require("../utils/n8nHelper");
const prisma = require("../lib/prisma");

const DEFAULT_SCHEDULE = {};

function sanitizeSchedule(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const cleaned = {};
  for (const [day, hours] of Object.entries(input)) {
    if (!Array.isArray(hours)) {
      return null;
    }

    const uniqueHours = [...new Set(
      hours
        .map((hour) => Number.parseInt(hour, 10))
        .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23)
    )].sort((a, b) => a - b);

    cleaned[day] = uniqueHours;
  }

  return cleaned;
}

async function ensureAdminStatus() {
  return prisma.adminStatus.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      status: AvailStatus.AVAILABLE,
      schedule: DEFAULT_SCHEDULE
    }
  });
}

async function getStatus(req, res, next) {
  try {
    const adminStatus = await ensureAdminStatus();
    return res.json({
      status: adminStatus.status,
      schedule: adminStatus.schedule || DEFAULT_SCHEDULE,
      updatedAt: adminStatus.updatedAt
    });
  } catch (error) {
    return next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body || {};
    if (!Object.values(AvailStatus).includes(status)) {
      return res.status(400).json({ error: "status debe ser AVAILABLE, WORKING, BUSY o OFF_HOURS" });
    }

    const updated = await prisma.adminStatus.upsert({
      where: { id: 1 },
      update: { status },
      create: {
        id: 1,
        status,
        schedule: DEFAULT_SCHEDULE
      }
    });

    const { io } = require("../index");
    if (io) {
      io.to("role-CLIENT").emit("admin:status-changed", { status: updated.status });
    }

    if (status === AvailStatus.BUSY) {
      const [activeClients, emailClients] = await Promise.all([
        prisma.clientProduct.findMany({
          where: {
            status: ContractStatus.ACTIVE
          },
          select: {
            clientId: true
          },
          distinct: ["clientId"]
        }),
        prisma.user.findMany({
          where: {
            role: "CLIENT",
            products: {
              some: {
                status: ContractStatus.ACTIVE
              }
            }
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        })
      ]);

      await Promise.all(
        activeClients.map((client) =>
          createNotification(client.clientId, {
            title: "Cambio en disponibilidad del administrador",
            body: "El administrador cambió su estado a Ocupado",
            type: NotifType.STATUS_CHANGE,
            linkUrl: "/dashboard"
          })
        )
      );

      await Promise.allSettled(
        emailClients
          .filter((client) => client.email)
          .map((client) =>
            sendEmail({
              to: client.email,
              subject: "Enyell está ocupada temporalmente",
              html: renderEmailLayout({
                title: "Enyell ocupada temporalmente",
                contentHtml: `
                  <p>Hola ${client.name},</p>
                  <p>Enyell está ocupada temporalmente.</p>
                  <p>Puedes contactarnos por WhatsApp mientras tanto.</p>
                  <p><a href="https://wa.me/${process.env.WHATSAPP_NUMBER || ""}">Abrir WhatsApp</a></p>
                `
              })
            })
          )
      );
    }

    return res.json({
      status: updated.status,
      schedule: updated.schedule || DEFAULT_SCHEDULE,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    return next(error);
  }
}

async function updateSchedule(req, res, next) {
  try {
    const schedule = sanitizeSchedule(req.body?.schedule);
    if (!schedule) {
      return res.status(400).json({ error: "schedule debe ser un objeto con días y arreglos de horas" });
    }

    const updated = await prisma.adminStatus.upsert({
      where: { id: 1 },
      update: { schedule },
      create: {
        id: 1,
        status: AvailStatus.AVAILABLE,
        schedule
      }
    });

    return res.json({
      status: updated.status,
      schedule: updated.schedule || DEFAULT_SCHEDULE,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    return next(error);
  }
}

async function notifyWorkingOn(req, res, next) {
  try {
    const { clientId, productName, isWorking } = req.body || {};
    const parsedClientId = Number.parseInt(clientId, 10);
    const safeProductName = String(productName || "").trim();

    if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
      return res.status(400).json({ error: "clientId es requerido y debe ser valido" });
    }
    if (!safeProductName) {
      return res.status(400).json({ error: "productName es requerido" });
    }
    if (typeof isWorking !== "boolean") {
      return res.status(400).json({ error: "isWorking debe ser true o false" });
    }

    const client = await prisma.user.findUnique({
      where: { id: parsedClientId },
      select: { id: true, role: true, name: true, phone: true }
    });
    if (!client || client.role !== "CLIENT") {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    const title = isWorking
      ? "Enyell está trabajando en tu pedido"
      : "Enyell terminó de trabajar";
    const body = isWorking
      ? `Empezo a trabajar en: ${safeProductName}`
      : `Termino de trabajar en: ${safeProductName}`;

    const notification = await createNotification(client.id, {
      title,
      body,
      type: NotifType.STATUS_CHANGE
    });

    try {
      await triggerN8n("working_on_order", {
        clientPhone: client.phone,
        clientName: client.name,
        productName: safeProductName,
        isWorking
      });
    } catch (error) {
      console.warn("N8N notification failed:", error.message);
    }

    return res.status(201).json({
      message: `Notificacion enviada a ${client.name}`,
      notification
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStatus,
  updateStatus,
  updateSchedule,
  notifyWorkingOn
};
