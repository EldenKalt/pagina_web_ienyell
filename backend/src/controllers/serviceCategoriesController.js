const prisma = require("../lib/prisma");

function serializeCategory(category, { admin = false } = {}) {
  const payload = {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    isLaunchActive: category.isLaunchActive,
    isActive: category.isActive,
    launchPrice: Number(category.launchPricePerHour),
    regularPrice: Number(category.regularPricePerHour),
    currentPrice: category.isLaunchActive
      ? Number(category.launchPricePerHour)
      : Number(category.regularPricePerHour),
    order: category.order,
  };
  if (admin) {
    payload.createdAt = category.createdAt;
    payload.updatedAt = category.updatedAt;
  }
  return payload;
}

// GET /api/service-categories — public, only active categories
async function listPublic(req, res, next) {
  try {
    const categories = await prisma.hourServiceCategory.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return res.json({ categories: categories.map((c) => serializeCategory(c)) });
  } catch (error) {
    return next(error);
  }
}

// GET /api/service-categories/admin — all categories, admin only
async function listAdmin(req, res, next) {
  try {
    const categories = await prisma.hourServiceCategory.findMany({
      orderBy: { order: "asc" },
    });
    return res.json({ categories: categories.map((c) => serializeCategory(c, { admin: true })) });
  } catch (error) {
    return next(error);
  }
}

// POST /api/service-categories — create a new category
async function createCategory(req, res, next) {
  try {
    const { name, slug, description, launchPrice, regularPrice, isLaunchActive, order } = req.body || {};

    const trimName = String(name || "").trim();
    if (!trimName) return res.status(400).json({ error: "name es requerido" });

    const trimSlug = String(slug || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!trimSlug) return res.status(400).json({ error: "slug es requerido" });

    const launch = Number(launchPrice);
    if (!Number.isFinite(launch) || launch <= 0) {
      return res.status(400).json({ error: "launchPrice debe ser un número positivo" });
    }

    const regular = Number(regularPrice);
    if (!Number.isFinite(regular) || regular <= 0) {
      return res.status(400).json({ error: "regularPrice debe ser un número positivo" });
    }

    const created = await prisma.hourServiceCategory.create({
      data: {
        name: trimName,
        slug: trimSlug,
        description: description ? String(description).trim() : null,
        launchPricePerHour: launch,
        regularPricePerHour: regular,
        isLaunchActive: isLaunchActive !== false,
        isActive: true,
        order: Number.isInteger(Number(order)) ? Number(order) : 0,
      },
    });
    return res.status(201).json(serializeCategory(created, { admin: true }));
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "El slug ya existe" });
    }
    return next(error);
  }
}

// PUT /api/service-categories/:id — update a category
async function updateCategory(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "id inválido" });
    }

    const { name, description, launchPrice, regularPrice, isLaunchActive, isActive, order } = req.body || {};
    const data = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ error: "name no puede estar vacío" });
      data.name = trimmed;
    }
    if (description !== undefined) {
      data.description = description ? String(description).trim() : null;
    }
    if (isLaunchActive !== undefined) data.isLaunchActive = Boolean(isLaunchActive);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (order !== undefined) {
      const parsed = Number.parseInt(order, 10);
      if (!Number.isInteger(parsed)) return res.status(400).json({ error: "order debe ser un entero" });
      data.order = parsed;
    }
    if (launchPrice !== undefined) {
      const parsed = Number(launchPrice);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return res.status(400).json({ error: "launchPrice debe ser un número positivo" });
      }
      data.launchPricePerHour = parsed;
    }
    if (regularPrice !== undefined) {
      const parsed = Number(regularPrice);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return res.status(400).json({ error: "regularPrice debe ser un número positivo" });
      }
      data.regularPricePerHour = parsed;
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({ error: "Sin campos para actualizar" });
    }

    const updated = await prisma.hourServiceCategory.update({
      where: { id },
      data,
    });
    return res.json(serializeCategory(updated, { admin: true }));
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Categoría no encontrada" });
    }
    return next(error);
  }
}

module.exports = { listPublic, listAdmin, createCategory, updateCategory };
