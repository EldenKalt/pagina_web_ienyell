const prisma = require("../lib/prisma");
const MOROSO_TAG = "moroso";

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function parsePositiveId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function codeStatus(code) {
  if (!code.isActive) {
    return "INACTIVE";
  }
  if (code.expiresAt && new Date(code.expiresAt) <= new Date()) {
    return "EXPIRED";
  }
  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return "EXHAUSTED";
  }
  return "ACTIVE";
}

function serializeCode(code) {
  return {
    ...code,
    status: codeStatus(code)
  };
}

async function validateDiscountCodeForUser(rawCode, userId) {
  const normalizedCode = normalizeCode(rawCode);
  if (!normalizedCode) {
    return { valid: false, reason: "Ingresá un código", statusCode: 400 };
  }

  const caller = await prisma.user.findUnique({
    where: { id: userId },
    select: { tags: true, morosoSince: true, morosoLiftedAt: true }
  });
  if (caller?.morosoSince) {
    return { valid: false, reason: "Los descuentos no están disponibles mientras haya cuotas pendientes" };
  }
  if (caller?.tags?.includes(MOROSO_TAG)) {
    return { valid: false, reason: "Los descuentos no están disponibles temporalmente para esta cuenta" };
  }

  const code = await prisma.discountCode.findUnique({
    where: { code: normalizedCode },
    include: {
      referralRewards: {
        select: {
          referrerId: true
        }
      }
    }
  });

  if (!code) {
    return { valid: false, reason: "El código no existe" };
  }
  if (!code.isActive) {
    return { valid: false, reason: "El código está inactivo" };
  }
  if (code.expiresAt && code.expiresAt <= new Date()) {
    return { valid: false, reason: "El código está vencido" };
  }
  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return { valid: false, reason: "El código alcanzó su límite de usos" };
  }
  if (
    code.referralRewards.length
    && !code.referralRewards.some((referral) => referral.referrerId === userId)
  ) {
    return { valid: false, reason: "Este código pertenece a otro cliente" };
  }

  const previousUsage = await prisma.discountUsage.findUnique({
    where: {
      codeId_userId: {
        codeId: code.id,
        userId
      }
    },
    select: { id: true }
  });
  if (previousUsage) {
    return { valid: false, reason: "Ya utilizaste este código" };
  }

  return {
    valid: true,
    discountPct: code.discountPct,
    codeId: code.id
  };
}

function parseCreatePayload(body) {
  const code = normalizeCode(body?.code);
  const discountPct = Number(body?.discountPct);
  const maxUses = body?.maxUses === null || body?.maxUses === "" || body?.maxUses === undefined
    ? null
    : Number(body.maxUses);
  const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null;

  if (!code || code.length > 40 || !/^[A-Z0-9_-]+$/.test(code)) {
    return { error: "El código debe usar letras, números, guiones o guion bajo (máximo 40 caracteres)" };
  }
  if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
    return { error: "discountPct debe estar entre 0 y 100" };
  }
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
    return { error: "maxUses debe ser un entero positivo o null" };
  }
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    return { error: "expiresAt no es una fecha válida" };
  }

  const VALID_ROLES = ["CLIENT", "ADMIN", "PROVEEDOR", "COLABORADOR"];
  const autoApplyToRole = body?.autoApplyToRole || null;
  if (autoApplyToRole && !VALID_ROLES.includes(autoApplyToRole)) {
    return { error: "Rol inválido para auto-aplicar" };
  }
  const autoApplyToUsers = Array.isArray(body?.autoApplyToUsers)
    ? body.autoApplyToUsers.filter((id) => Number.isInteger(id) && id > 0)
    : [];

  return {
    data: {
      code,
      discountPct,
      maxUses,
      expiresAt,
      autoApplyToRole,
      autoApplyToUsers
    }
  };
}

async function listCodes(req, res, next) {
  try {
    const codes = await prisma.discountCode.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.json({ codes: codes.map(serializeCode) });
  } catch (error) {
    return next(error);
  }
}

async function createCode(req, res, next) {
  try {
    const parsed = parseCreatePayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const existing = await prisma.discountCode.findUnique({
      where: { code: parsed.data.code },
      select: { id: true }
    });
    if (existing) {
      return res.status(409).json({ error: "Ese código ya existe" });
    }

    const code = await prisma.discountCode.create({
      data: {
        ...parsed.data,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(201).json(serializeCode(code));
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Ese código ya existe" });
    }
    return next(error);
  }
}

async function toggleCode(req, res, next) {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const current = await prisma.discountCode.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ error: "Código no encontrado" });
    }

    const updated = await prisma.discountCode.update({
      where: { id },
      data: { isActive: !current.isActive },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.json(serializeCode(updated));
  } catch (error) {
    return next(error);
  }
}

async function deleteCode(req, res, next) {
  try {
    const id = parsePositiveId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const code = await prisma.discountCode.findUnique({
      where: { id },
      select: {
        id: true,
        usedCount: true,
        _count: {
          select: {
            usages: true
          }
        }
      }
    });
    if (!code) {
      return res.status(404).json({ error: "Código no encontrado" });
    }
    if (code.usedCount > 0 || code._count.usages > 0) {
      return res.status(400).json({ error: "No se puede eliminar un código que ya tiene usos" });
    }

    await prisma.$transaction([
      prisma.referral.updateMany({
        where: { rewardCodeId: id },
        data: { rewardCodeId: null }
      }),
      prisma.discountCode.delete({ where: { id } })
    ]);

    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
}

async function validateCode(req, res, next) {
  try {
    const validation = await validateDiscountCodeForUser(req.body?.code, req.user.id);
    const statusCode = validation.statusCode || 200;
    return res.status(statusCode).json(validation);
  } catch (error) {
    return next(error);
  }
}

async function getBestAutoDiscount(userId, userRole) {
  const caller = await prisma.user.findUnique({
    where: { id: userId },
    select: { morosoSince: true, tags: true }
  });
  if (caller?.morosoSince || caller?.tags?.includes(MOROSO_TAG)) {
    return null;
  }

  const now = new Date();
  const candidates = await prisma.discountCode.findMany({
    where: {
      isActive: true,
      OR: [
        { autoApplyToRole: userRole },
        { autoApplyToUsers: { has: userId } },
      ],
    },
    include: {
      referralRewards: { select: { referrerId: true } },
    },
    orderBy: { discountPct: "desc" },
  });

  for (const code of candidates) {
    if (code.expiresAt && code.expiresAt <= now) continue;
    if (code.maxUses !== null && code.usedCount >= code.maxUses) continue;
    if (code.referralRewards.length && !code.referralRewards.some((r) => r.referrerId === userId)) continue;

    const used = await prisma.discountUsage.findUnique({
      where: { codeId_userId: { codeId: code.id, userId } },
      select: { id: true },
    });
    if (used) continue;

    return { valid: true, discountPct: code.discountPct, codeId: code.id, code: code.code, autoApplied: true };
  }

  return null;
}

async function getMyAutoDiscount(req, res, next) {
  try {
    const result = await getBestAutoDiscount(req.user.id, req.user.role);
    return res.json({ discount: result });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listCodes,
  createCode,
  toggleCode,
  deleteCode,
  validateCode,
  validateDiscountCodeForUser,
  getBestAutoDiscount,
  getMyAutoDiscount
};
