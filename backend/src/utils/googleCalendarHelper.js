const crypto = require("crypto");
const { google } = require("googleapis");

const REQUIRED_ENV_KEYS = [
  "GOOGLE_CALENDAR_CLIENT_ID",
  "GOOGLE_CALENDAR_CLIENT_SECRET",
  "GOOGLE_CALENDAR_REFRESH_TOKEN",
  "GOOGLE_CALENDAR_ID"
];

function getMissingCalendarConfig() {
  return REQUIRED_ENV_KEYS.filter((key) => !String(process.env[key] || "").trim());
}

function getCalendarTimeZone() {
  return process.env.GOOGLE_CALENDAR_TIME_ZONE || "America/Costa_Rica";
}

function getEventDurationMinutes() {
  const parsed = Number.parseInt(process.env.GOOGLE_CALENDAR_EVENT_DURATION_MINUTES || "30", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 30;
}

function buildAuthClient() {
  const missing = getMissingCalendarConfig();
  if (missing.length) {
    const error = new Error(`Faltan variables de Google Calendar: ${missing.join(", ")}`);
    error.code = "GOOGLE_CALENDAR_NOT_CONFIGURED";
    error.status = 400;
    throw error;
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  );

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
  });

  return auth;
}

function buildCalendarApi() {
  const auth = buildAuthClient();
  return google.calendar({ version: "v3", auth });
}

function buildEventDescription({ ticket, client, contactMethod }) {
  const contactLabels = {
    PHONE: "Llamada telefonica",
    WHATSAPP: "WhatsApp",
    GOOGLE_MEET: "Google Meet"
  };

  return [
    `Ticket: ${ticket.subject}`,
    `Cliente: ${client.name}`,
    `Empresa: ${client.company || "-"}`,
    `Medio: ${contactLabels[contactMethod] || contactMethod}`
  ].join("\n");
}

function mapGoogleCalendarError(error) {
  const rawResponseError = error?.response?.data?.error;
  const googleError =
    (typeof rawResponseError === "string" ? rawResponseError : rawResponseError?.code || rawResponseError?.status) ||
    error?.errors?.[0]?.reason ||
    error?.code ||
    error?.message;
  const normalizedError = String(googleError || "").trim().toLowerCase();

  if (normalizedError.includes("invalid_grant")) {
    const mapped = new Error(
      "Google Calendar rechazo la autenticacion OAuth. Regenera el refresh token en OAuth Playground y verifica CLIENT_ID, CLIENT_SECRET y la cuenta autorizada."
    );
    mapped.status = 400;
    mapped.code = "GOOGLE_CALENDAR_INVALID_GRANT";
    return mapped;
  }

  if (normalizedError.includes("unauthorized_client") || normalizedError.includes("invalid_client")) {
    const mapped = new Error(
      "Las credenciales OAuth de Google Calendar no son validas. Verifica CLIENT_ID, CLIENT_SECRET y el tipo de cliente OAuth."
    );
    mapped.status = 400;
    mapped.code = "GOOGLE_CALENDAR_INVALID_CLIENT";
    return mapped;
  }

  if (normalizedError.includes("insufficientpermissions") || normalizedError.includes("forbidden")) {
    const mapped = new Error(
      "La cuenta de Google no tiene permisos suficientes para crear eventos en ese calendario. Verifica scopes y acceso al calendario."
    );
    mapped.status = 403;
    mapped.code = "GOOGLE_CALENDAR_FORBIDDEN";
    return mapped;
  }

  if (normalizedError.includes("notfound") || error?.response?.status === 404) {
    const mapped = new Error("El evento de Google Calendar ya no existe o no fue encontrado.");
    mapped.status = 404;
    mapped.code = "GOOGLE_CALENDAR_EVENT_NOT_FOUND";
    return mapped;
  }

  return error;
}

async function createCalendarEvent({ ticket, client, start, contactMethod }) {
  try {
    const calendar = buildCalendarApi();
    const durationMinutes = getEventDurationMinutes();
    const timeZone = getCalendarTimeZone();
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    const requestBody = {
      summary: `Llamada Util · ${ticket.subject}`,
      description: buildEventDescription({ ticket, client, contactMethod }),
      start: {
        dateTime: start.toISOString(),
        timeZone
      },
      end: {
        dateTime: end.toISOString(),
        timeZone
      },
      attendees: client.email ? [{ email: client.email, displayName: client.name }] : []
    };

    if (contactMethod === "PHONE") {
      requestBody.location = client.phone || "Llamada telefonica";
    }

    if (contactMethod === "WHATSAPP") {
      requestBody.location = `WhatsApp: ${client.phone || process.env.WHATSAPP_NUMBER || ""}`.trim();
    }

    if (contactMethod === "GOOGLE_MEET") {
      requestBody.conferenceData = {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      };
    }

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody,
      conferenceDataVersion: contactMethod === "GOOGLE_MEET" ? 1 : 0,
      sendUpdates: "all"
    });

    const event = response.data || {};
    const meetEntry = event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video");

    return {
      calendarEventId: event.id || null,
      calendarHtmlLink: event.htmlLink || meetEntry?.uri || null,
      selectedEnd: end
    };
  } catch (error) {
    throw mapGoogleCalendarError(error);
  }
}

async function deleteCalendarEvent(calendarEventId) {
  if (!String(calendarEventId || "").trim()) {
    return { deleted: false };
  }

  try {
    const calendar = buildCalendarApi();
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId: calendarEventId,
      sendUpdates: "all"
    });
    return { deleted: true };
  } catch (error) {
    throw mapGoogleCalendarError(error);
  }
}

module.exports = {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarTimeZone,
  getEventDurationMinutes,
  getMissingCalendarConfig
};
