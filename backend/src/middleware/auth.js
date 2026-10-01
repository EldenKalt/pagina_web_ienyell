const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const MOROSO_ALLOWED_PATHS = [
  "/api/installments",
  "/api/subscriptions",
  "/api/checkout",
  "/api/webhooks",
  "/api/auth",
  "/api/notifications",
  "/api/users/me",
  "/api/users/account"
];

function tokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  return req.cookies?.ienyell_session || (authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null);
}

async function authenticateToken(req, res, next) {
  const token = tokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'ienyell-api', audience: 'ienyell-app' });
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        isActive: true,
        enabledFeatures: true,
        morosoSince: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Esta cuenta está desactivada. Contacte al administrador."
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      enabledFeatures: user.enabledFeatures || [],
      morosoSince: user.morosoSince || null
    };

    if (user.morosoSince && user.role === "CLIENT") {
      const pathAllowed = MOROSO_ALLOWED_PATHS.some((p) => req.path.startsWith(p));
      if (!pathAllowed) {
        return res.status(403).json({
          error: "Su cuenta está restringida por cuotas vencidas. Realice los pagos pendientes para restaurar el acceso.",
          code: "MOROSO"
        });
      }
    }

    return next();
  } catch (error) {
    const jwtErrorNames = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"];
    if (!jwtErrorNames.includes(error?.name)) {
      return next(error);
    }
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

async function authenticateOptional(req, res, next) {
  const token = tokenFromRequest(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'ienyell-api', audience: 'ienyell-app' });
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        isActive: true,
        enabledFeatures: true
      }
    });

    req.user = (user && user.isActive)
      ? {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          enabledFeatures: user.enabledFeatures || []
        }
      : null;
  } catch (error) {
    req.user = null;
  }

  return next();
}

function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "No tienes permiso para esta acción" });
    }

    return next();
  };
}

function authorizeFeature(featureKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado" });
    }
    if (req.user.role === "ADMIN") {
      return next();
    }
    if (req.user.role === "COLABORADOR" && req.user.enabledFeatures.includes(featureKey)) {
      return next();
    }
    return res.status(403).json({ error: "No tienes permiso para esta función" });
  };
}

module.exports = {
  authenticateToken,
  authenticateOptional,
  authorizeRole,
  authorizeFeature
};
