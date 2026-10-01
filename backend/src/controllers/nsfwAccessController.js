const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { renderEmailLayout, sendEmail } = require("../utils/emailHelper");
const { buildFrontendUrl } = require("../utils/publicUrl");

const ACCESS_PURPOSE = "nsfw-access";
const ACCESS_DURATION_MS = 24 * 60 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 15 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUCCESS_MESSAGE = "Si el correo es válido, recibirás un enlace de acceso.";

function getAccessSecret() {
  const secret = process.env.NSFW_ACCESS_SECRET;
  if (!secret) {
    throw new Error("NSFW_ACCESS_SECRET no está configurado");
  }
  return secret;
}

function safeText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function requestAccess(req, res, next) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      return res.json({ message: SUCCESS_MESSAGE });
    }

    const now = new Date();
    const recentRequest = await prisma.nsfwAccessRequest.findFirst({
      where: {
        email,
        createdAt: { gte: new Date(now.getTime() - REQUEST_COOLDOWN_MS) }
      },
      orderBy: { createdAt: "desc" }
    });
    if (recentRequest) {
      return res.json({ message: SUCCESS_MESSAGE });
    }

    const secret = getAccessSecret();
    const token = jwt.sign(
      { email, purpose: ACCESS_PURPOSE },
      secret,
      { expiresIn: "24h" }
    );
    const expiresAt = new Date(now.getTime() + ACCESS_DURATION_MS);
    const accessUrl = `${buildFrontendUrl("/portfolio/nsfw")}?token=${encodeURIComponent(token)}`;

    const emailHtml = renderEmailLayout({
      title: "Tu acceso al portfolio NSFW",
      contentHtml: `
        <p>Hola,</p>
        <p>Solicitaste acceso al portfolio NSFW de Enyell. Este enlace es válido durante 24 horas.</p>
        <p>
          <a href="${safeText(accessUrl)}" style="display:inline-block; padding:12px 16px; background:#e94560; color:#FFFFFF; border-radius:6px; text-decoration:none; font-weight:700;">
            Ver portfolio NSFW
          </a>
        </p>
      `
    });

    await sendEmail({
      to: email,
      subject: "Tu acceso al portfolio NSFW — Enyell",
      html: emailHtml
    });

    await prisma.nsfwAccessRequest.create({
      data: { email, token, expiresAt }
    });

    return res.json({ message: SUCCESS_MESSAGE });
  } catch (error) {
    return next(error);
  }
}

async function verifyAccess(req, res, next) {
  try {
    const token = String(req.query?.token || "").trim();
    const decoded = jwt.verify(token, getAccessSecret());
    if (
      !decoded ||
      typeof decoded !== "object" ||
      decoded.purpose !== ACCESS_PURPOSE ||
      typeof decoded.email !== "string" ||
      typeof decoded.exp !== "number"
    ) {
      return res.status(401).json({ error: "Enlace expirado o inválido" });
    }

    return res.json({
      valid: true,
      email: decoded.email,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    });
  } catch (_error) {
    return res.status(401).json({ error: "Enlace expirado o inválido" });
  }
}

module.exports = {
  requestAccess,
  verifyAccess
};
