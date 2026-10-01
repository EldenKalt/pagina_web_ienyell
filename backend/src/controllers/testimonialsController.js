const prisma = require("../lib/prisma");

function parseId(id) {
  const n = Number.parseInt(id, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function sanitizeText(val, max = 500) {
  return String(val || "").trim().slice(0, max);
}

function sanitizeStars(val) {
  const n = Number.parseInt(val, 10);
  if (!Number.isInteger(n) || n < 1) return 5;
  if (n > 5) return 5;
  return n;
}

async function getPublicTestimonials(req, res, next) {
  try {
    const items = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }]
    });
    return res.json(items);
  } catch (error) {
    return next(error);
  }
}

async function getAllTestimonials(req, res, next) {
  try {
    const items = await prisma.testimonial.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }]
    });
    return res.json(items);
  } catch (error) {
    return next(error);
  }
}

async function createTestimonial(req, res, next) {
  try {
    const name = sanitizeText(req.body?.name, 120);
    const content = sanitizeText(req.body?.content, 1000);
    if (!name) return res.status(400).json({ error: "name es requerido" });
    if (!content) return res.status(400).json({ error: "content es requerido" });

    const item = await prisma.testimonial.create({
      data: {
        name,
        content,
        role: sanitizeText(req.body?.role, 120) || null,
        company: sanitizeText(req.body?.company, 120) || null,
        socialHandle: sanitizeText(req.body?.socialHandle, 80) || null,
        socialNetwork: sanitizeText(req.body?.socialNetwork, 40) || null,
        avatarUrl: sanitizeText(req.body?.avatarUrl, 500) || null,
        stars: sanitizeStars(req.body?.stars),
        isActive: req.body?.isActive !== false,
        order: Number.isFinite(Number(req.body?.order)) ? Number(req.body.order) : 0
      }
    });
    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
}

async function updateTestimonial(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });

    const data = {};
    const body = req.body || {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      const name = sanitizeText(body.name, 120);
      if (!name) return res.status(400).json({ error: "name no puede estar vacío" });
      data.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(body, "content")) {
      const content = sanitizeText(body.content, 1000);
      if (!content) return res.status(400).json({ error: "content no puede estar vacío" });
      data.content = content;
    }
    if (Object.prototype.hasOwnProperty.call(body, "role")) data.role = sanitizeText(body.role, 120) || null;
    if (Object.prototype.hasOwnProperty.call(body, "company")) data.company = sanitizeText(body.company, 120) || null;
    if (Object.prototype.hasOwnProperty.call(body, "socialHandle")) data.socialHandle = sanitizeText(body.socialHandle, 80) || null;
    if (Object.prototype.hasOwnProperty.call(body, "socialNetwork")) data.socialNetwork = sanitizeText(body.socialNetwork, 40) || null;
    if (Object.prototype.hasOwnProperty.call(body, "avatarUrl")) data.avatarUrl = sanitizeText(body.avatarUrl, 500) || null;
    if (Object.prototype.hasOwnProperty.call(body, "stars")) data.stars = sanitizeStars(body.stars);
    if (Object.prototype.hasOwnProperty.call(body, "isActive")) data.isActive = Boolean(body.isActive);
    if (Object.prototype.hasOwnProperty.call(body, "order")) data.order = Number.isFinite(Number(body.order)) ? Number(body.order) : 0;

    if (!Object.keys(data).length) return res.status(400).json({ error: "No hay campos para actualizar" });

    const item = await prisma.testimonial.update({ where: { id }, data });
    return res.json(item);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Testimonio no encontrado" });
    return next(error);
  }
}

async function deleteTestimonial(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    await prisma.testimonial.delete({ where: { id } });
    return res.json({ message: "Testimonio eliminado" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Testimonio no encontrado" });
    return next(error);
  }
}

module.exports = {
  getPublicTestimonials,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
};
