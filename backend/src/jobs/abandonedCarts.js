require("dotenv").config();

// Cron sugerido:
// 0 * * * * cd /ruta/backend && npm run jobs:abandoned-carts

const prisma = require("../lib/prisma");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const { triggerN8n } = require("../utils/n8nHelper");
const { getFrontendUrl } = require("../utils/publicUrl");

const ABANDONED_CART_CUTOFF_MS = 2 * 60 * 60 * 1000;
const colonesFormatter = new Intl.NumberFormat("es-CR");

function formatColones(value) {
  return colonesFormatter.format(Math.round(Number(value || 0)));
}

function safeText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function frontendUrl() {
  return getFrontendUrl();
}

function checkoutUrlForOrder(orderId) {
  return `${frontendUrl()}/checkout?orderId=${encodeURIComponent(orderId)}`;
}

function abandonedCartCutoff(now = new Date()) {
  return new Date(now.getTime() - ABANDONED_CART_CUTOFF_MS);
}

async function sendOrderReminder(order) {
  const checkoutUrl = checkoutUrlForOrder(order.id);
  const priceTotal = formatColones(order.finalAmountCRC / 100);
  const clientName = order.client?.name || "cliente";
  const productName = order.product?.name || "producto";

  const emailHtml = renderEmailLayout({
    title: "Tienes un producto esperando",
    contentHtml: `
      <p>Hola ${safeText(clientName)},</p>
      <p>Dejaste <strong>${safeText(productName)}</strong> por <strong>₡${safeText(priceTotal)}</strong> pendiente de pago.</p>
      <p>
        <a href="${safeText(checkoutUrl)}" style="display:inline-block; padding:12px 16px; background:#F5C025; color:#1F1F1E; border-radius:6px; text-decoration:none; font-weight:700;">
          Completar mi compra
        </a>
      </p>
    `
  });

  const [emailSent, n8nSent] = await Promise.all([
    order.client?.email
      ? sendEmail({
          to: order.client.email,
          subject: "¿Olvidaste completar tu compra? — Enyell",
          html: emailHtml
        })
      : Promise.resolve(false),
    triggerN8n("abandoned_cart", {
      cartType: "product",
      clientPhone: order.client?.phone || "",
      clientName,
      productName,
      priceTotal,
      checkoutUrl
    })
  ]);

  await prisma.order.update({
    where: { id: order.id },
    data: { abandonmentNotifiedAt: new Date() }
  });

  return { id: `order-${order.id}`, emailSent: Boolean(emailSent), n8nSent: Boolean(n8nSent) };
}

async function runAbandonedCartReminders({ now = new Date() } = {}) {
  const cutoff = abandonedCartCutoff(now);
  const abandonedOrders = await prisma.order.findMany({
    where: {
      type: "PRODUCT",
      status: "PENDING",
      createdAt: { lt: cutoff },
      abandonmentNotifiedAt: null
    },
    include: {
      client: { select: { name: true, email: true, phone: true } },
      product: { select: { name: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  const results = [];
  for (const order of abandonedOrders) {
    try {
      results.push(await sendOrderReminder(order));
    } catch (error) {
      console.error(`No se pudo procesar orden abandonada ${order.id}:`, error);
      await prisma.order.update({
        where: { id: order.id },
        data: { abandonmentNotifiedAt: new Date() }
      });
      results.push({ id: `order-${order.id}`, emailSent: false, n8nSent: false, error: error.message });
    }
  }

  return { notified: results.length, results };
}

if (require.main === module) {
  runAbandonedCartReminders()
    .then(({ notified }) => {
      console.log(`Notificaciones enviadas: ${notified}`);
    })
    .catch((error) => {
      console.error("Error al ejecutar carritos abandonados:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = {
  abandonedCartCutoff,
  checkoutUrlForOrder,
  runAbandonedCartReminders
};
