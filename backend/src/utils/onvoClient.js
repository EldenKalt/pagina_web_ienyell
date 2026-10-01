const crypto = require("crypto");

function getConfig() {
  const apiUrl = String(process.env.ONVO_API_URL || "https://api.onvopay.com/v1").replace(/\/+$/, "");
  const secretKey = process.env.ONVO_SECRET_KEY;
  if (!secretKey) {
    const error = new Error("Error de configuración del proveedor de pago");
    error.status = 500;
    throw error;
  }
  return { apiUrl, secretKey };
}

async function onvoRequest(method, path, body) {
  const { apiUrl, secretKey } = getConfig();
  const headers = { Authorization: `Bearer ${secretKey}` };
  const options = { method, headers };
  if (body !== undefined && method !== "GET") {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${apiUrl}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `Onvo request failed: ${method} ${path}`);
    error.status = response.status || 502;
    error.onvoPayload = payload;
    throw error;
  }
  return payload;
}

// --- Checkout sessions (one-time) ---

async function createOneTimeCheckoutSession({ amountCRC, currency = "CRC", description, customerEmail, metadata, onBehalfOf }) {
  const body = {
    lineItems: [{ quantity: 1, unitAmount: amountCRC, currency, description }],
    ...(onBehalfOf ? { onBehalfOf } : {}),
    customerEmail,
    redirectUrl: process.env.ONVO_SUCCESS_URL,
    cancelUrl: process.env.ONVO_CANCEL_URL,
    metadata
  };
  const payload = await onvoRequest("POST", "/checkout/sessions/one-time-link", body);
  if (!payload.url) {
    const error = new Error("No se pudo crear la sesión de checkout");
    error.status = 502;
    throw error;
  }
  return payload;
}

// --- Customers ---

async function createCustomer({ email, name }) {
  return onvoRequest("POST", "/customers", { email, name });
}

async function getCustomer(customerId) {
  return onvoRequest("GET", `/customers/${customerId}`);
}

// --- Payment intents (for installments / tractos) ---

async function createPaymentIntent({ customerId, amountCRC, currency = "CRC", description, metadata }) {
  return onvoRequest("POST", "/payment-intents", {
    customerId,
    amount: amountCRC,
    currency,
    description,
    metadata
  });
}

// --- Recurring charges (for subscriptions) ---

async function createRecurringCharge({ customerId, paymentMethodId, amountCRC, currency = "CRC", interval, description, metadata }) {
  return onvoRequest("POST", "/recurring-charges", {
    customerId,
    paymentMethodId,
    amount: amountCRC,
    currency,
    interval,
    description,
    metadata
  });
}

async function confirmRecurringCharge(chargeId) {
  return onvoRequest("POST", `/recurring-charges/${chargeId}/confirm`);
}

async function cancelRecurringCharge(chargeId) {
  return onvoRequest("POST", `/recurring-charges/${chargeId}/cancel`);
}

// --- Webhook verification ---

function constantTimeEquals(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signatureCandidates(rawBody, secret) {
  const hex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const base64 = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  return [hex, `sha256=${hex}`, base64, `sha256=${base64}`];
}

function verifyWebhookSignature(req) {
  const secret = process.env.ONVO_WEBHOOK_SECRET;
  const signature = req.get("X-Onvo-Signature");
  const webhookSecret = req.get("X-Webhook-Secret");

  if (!secret) {
    return false;
  }

  if (webhookSecret && constantTimeEquals(webhookSecret, secret)) {
    return true;
  }

  if (!signature || !Buffer.isBuffer(req.body)) {
    return false;
  }

  return signatureCandidates(req.body, secret).some((candidate) => constantTimeEquals(candidate, signature));
}

function parseWebhookBody(rawBody) {
  if (!Buffer.isBuffer(rawBody)) {
    return null;
  }
  try {
    return JSON.parse(rawBody.toString("utf8"));
  } catch (_error) {
    return null;
  }
}

module.exports = {
  createOneTimeCheckoutSession,
  createCustomer,
  getCustomer,
  createPaymentIntent,
  createRecurringCharge,
  confirmRecurringCharge,
  cancelRecurringCharge,
  verifyWebhookSignature,
  parseWebhookBody
};
