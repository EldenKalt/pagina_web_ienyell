async function triggerN8n(eventType, payload) {
  const webhookUrl = String(process.env.N8N_WEBHOOK_URL || "").trim();
  const webhookSecret = String(process.env.N8N_WEBHOOK_SECRET || "").trim();

  if (!webhookUrl) {
    console.warn(`N8N_WEBHOOK_URL no esta configurado. Se omite el evento ${eventType}.`);
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": webhookSecret
      },
      body: JSON.stringify({
        event: eventType,
        data: payload,
        timestamp: new Date().toISOString()
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      console.error(`n8n respondio ${response.status} para el evento ${eventType}. ${responseText}`);
      return false;
    }

    return true;
  } catch (error) {
    const detail = error?.name === "AbortError"
      ? "Timeout de 5s al disparar el webhook."
      : error?.message || error;
    console.error(`No se pudo disparar el webhook de n8n para ${eventType}:`, detail);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  triggerN8n
};
