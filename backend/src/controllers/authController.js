const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { ContractStatus, ReferralStatus, Role } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { sendEmail, renderEmailLayout } = require("../utils/emailHelper");

function parseGoogleAudiences() {
  return [
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_IDS
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

const GOOGLE_OAUTH_AUDIENCES = parseGoogleAudiences();
const googleClient = new OAuth2Client(GOOGLE_OAUTH_AUDIENCES[0]);
const SALT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{8}$/;
const INACTIVE_ACCOUNT_MESSAGE = "Esta cuenta está desactivada. Contacte al administrador.";
const SESSION_COOKIE_NAME = "ienyell_session";
const PERSISTENT_SESSION_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_DURATION_SHORT = "12h";
const SESSION_DURATION_LONG = "30d";

function sessionCookieOptions({ rememberSession = false } = {}) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  };

  if (rememberSession) {
    options.maxAge = PERSISTENT_SESSION_COOKIE_MAX_AGE_MS;
  }

  return options;
}

function setSessionCookie(res, token, options = {}) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(options));
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
}

function signToken(user, { rememberSession = false } = {}) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      issuer: 'ienyell-api',
      audience: 'ienyell-app',
      expiresIn: rememberSession ? SESSION_DURATION_LONG : SESSION_DURATION_SHORT
    }
  );
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    enabledFeatures: user.enabledFeatures || []
  };
}

async function login(req, res, next) {
  try {
    const { email, password, rememberSession } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña son requeridos" });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: INACTIVE_ACCOUNT_MESSAGE });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const persistSession = Boolean(rememberSession);
    const token = signToken(user, { rememberSession: persistSession });
    setSessionCookie(res, token, { rememberSession: persistSession });
    return res.json({ token, user: serializeUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password, company, phone, rememberSession } = req.body || {};
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = String(phone || "").trim();
    const normalizedCompany = String(company || "").trim() || null;

    if (!normalizedName || !normalizedEmail || !password || !normalizedPhone) {
      return res.status(400).json({ error: "name, email, password y phone son requeridos" });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: "El correo electrónico no es válido" });
    }

    if (!PHONE_REGEX.test(normalizedPhone)) {
      return res.status(400).json({ error: "El teléfono debe contener exactamente 8 dígitos" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }
    });

    if (existingUser) {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }

    const referrerId = Number.parseInt(req.query?.ref, 10);
    const validReferrerId = Number.isInteger(referrerId) && referrerId > 0
      ? referrerId
      : null;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          passwordHash,
          role: Role.CLIENT,
          company: normalizedCompany,
          phone: normalizedPhone,
          isActive: true
        }
      });

      if (validReferrerId) {
        const referral = await tx.referral.findFirst({
          where: {
            referrerId: validReferrerId,
            referredEmail: normalizedEmail,
            status: ReferralStatus.PENDING
          },
          orderBy: { createdAt: "asc" },
          select: { id: true }
        });

        if (referral) {
          await tx.referral.update({
            where: { id: referral.id },
            data: {
              status: ReferralStatus.REGISTERED,
              referredId: createdUser.id
            }
          });
        }
      }

      return createdUser;
    });

    const persistSession = Boolean(rememberSession);
    const token = signToken(user, { rememberSession: persistSession });
    setSessionCookie(res, token, { rememberSession: persistSession });
    return res.status(201).json({ token, user: serializeUser(user) });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }
    return next(error);
  }
}

async function googleLogin(req, res, next) {
  try {
    const { token, rememberSession } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: "Token de Google es requerido" });
    }

    if (!GOOGLE_OAUTH_AUDIENCES.length) {
      return res.status(500).json({ error: "Google OAuth no está configurado en el servidor" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_OAUTH_AUDIENCES,
    });
    
    const payload = ticket.getPayload();
    if (!payload.email_verified) {
      return res.status(401).json({ error: "El correo de Google no está verificado" });
    }

    const { email, name, sub: googleId } = payload;
    const normalizedEmail = String(email).trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ error: INACTIVE_ACCOUNT_MESSAGE });
      }
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId }
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name || "Usuario de Google",
          googleId,
          role: Role.CLIENT,
          isActive: true
        }
      });
    }

    const persistSession = Boolean(rememberSession);
    const jwtToken = signToken(user, { rememberSession: persistSession });
    setSessionCookie(res, jwtToken, { rememberSession: persistSession });
    return res.json({ token: jwtToken, user: serializeUser(user) });
  } catch (error) {
    console.error("[googleLogin] Error:", {
      message: error?.message,
      audiences: GOOGLE_OAUTH_AUDIENCES
    });
    return res.status(401).json({ error: "Autenticación con Google fallida" });
  }
}

function check(req, res) {
  return res.json({
    valid: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      enabledFeatures: req.user.enabledFeatures || [],
      morosoSince: req.user.morosoSince || null
    }
  });
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: req.user.role === Role.CLIENT
        ? {
            products: {
              where: { status: ContractStatus.ACTIVE },
              include: { product: true }
            }
          }
        : req.user.role === 'PROVEEDOR'
        ? {
            providerProducts: {
              where: { isActive: true },
              select: { id: true, name: true }
            }
          }
        : undefined
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    if (user.role === Role.CLIENT) {
      publicUser.products = user.products || [];
      publicUser.morosoSince = user.morosoSince || null;
    }

    if (user.role === 'PROVEEDOR') {
      publicUser.providerProducts = user.providerProducts || [];
      publicUser.onvoSubAccountId = user.onvoSubAccountId ? 'configurado' : null;
    }

    if (user.role === 'COLABORADOR') {
      publicUser.enabledFeatures = user.enabledFeatures || [];
    }

    return res.json(publicUser);
  } catch (error) {
    return next(error);
  }
}

function logout(req, res) {
  clearSessionCookie(res);
  return res.json({ success: true });
}

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "El correo es requerido" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, passwordHash: true }
    });

    if (!user || !user.passwordHash) {
      return res.json({ sent: true });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)
      }
    });

    const resetUrl = `${process.env.FRONTEND_URL || "https://app.ienyell.com"}/restablecer?token=${token}&email=${encodeURIComponent(user.email)}`;

    const html = renderEmailLayout({
      title: "Restablecer contraseña",
      contentHtml: `
        <p>Hola <strong>${user.name}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de su cuenta en Útil.</p>
        <p style="text-align:center; margin:32px 0;">
          <a href="${resetUrl}" style="display:inline-block; background:#FFC300; color:#003049; padding:14px 36px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
            Restablecer contraseña
          </a>
        </p>
        <p>Este enlace expira en <strong>1 hora</strong>. Si no solicitó este cambio, ignore este correo.</p>
      `
    });

    await sendEmail({
      to: user.email,
      subject: "Útil — Restablecer contraseña",
      html
    });

    return res.json({ sent: true });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, email, password } = req.body || {};

    if (!token || !email || !password) {
      return res.status(400).json({ error: "Token, email y nueva contraseña son requeridos" });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
    }

    const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, resetToken: true, resetTokenExpiry: true }
    });

    if (!user || user.resetToken !== hashedToken || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ error: "El enlace es inválido o ha expirado. Solicite uno nuevo." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  register,
  googleLogin,
  check,
  me,
  logout,
  forgotPassword,
  resetPassword
};
