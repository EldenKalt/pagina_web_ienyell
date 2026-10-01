const DEFAULT_PRODUCTION_FRONTEND_URL = "https://ienyell.com";
const DEFAULT_DEVELOPMENT_FRONTEND_URL = "http://localhost:5173";
const NEXT_DEVELOPMENT_FRONTEND_URL = "http://localhost:3000";

function normalizeUrl(value, fallback) {
  const normalized = String(value || fallback || "").trim().replace(/\/+$/, "");
  return normalized || String(fallback || "").trim().replace(/\/+$/, "");
}

function getFrontendUrl() {
  const fallback = process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_FRONTEND_URL
    : DEFAULT_DEVELOPMENT_FRONTEND_URL;

  return normalizeUrl(process.env.FRONTEND_URL, fallback);
}

function getFrontendHost() {
  try {
    return new URL(getFrontendUrl()).host;
  } catch (_error) {
    return "ienyell.com";
  }
}

function buildFrontendUrl(path = "/") {
  const baseUrl = getFrontendUrl();
  const normalizedPath = String(path || "/").trim();
  if (!normalizedPath || normalizedPath === "/") {
    return `${baseUrl}/`;
  }
  return normalizedPath.startsWith("/") ? `${baseUrl}${normalizedPath}` : `${baseUrl}/${normalizedPath}`;
}

function getAllowedOrigins() {
  const allowedOrigins = new Set();
  const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => normalizeUrl(origin, ""))
    .filter(Boolean);

  configuredOrigins.forEach((origin) => allowedOrigins.add(origin));
  allowedOrigins.add(getFrontendUrl());

  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add(DEFAULT_DEVELOPMENT_FRONTEND_URL);
    allowedOrigins.add(NEXT_DEVELOPMENT_FRONTEND_URL);
  }

  return Array.from(allowedOrigins);
}

module.exports = {
  buildFrontendUrl,
  getAllowedOrigins,
  getFrontendHost,
  getFrontendUrl
};
