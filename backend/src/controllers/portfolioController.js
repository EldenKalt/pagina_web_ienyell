const { Role } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { publishDuePortfolioProjects } = require("../services/publishingScheduler");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `proyecto-${Date.now()}`;
}

async function ensureUniqueSlug(base, excludeId = null) {
  let candidate = base;
  let counter = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.portfolioProject.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

function normalizeProject(project) {
  if (!project) return null;
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    client: project.client || null,
    date: project.date || null,
    summary: project.summary || "",
    approach: project.approach || "",
    budget: project.budget || null,
    aspectRatio: project.aspectRatio || "4/3",
    liveUrl: project.liveUrl || null,
    showBrowserFrame: Boolean(project.showBrowserFrame),
    coverUrl: project.coverUrl || null,
    categories: Array.isArray(project.categories) ? project.categories : [],
    software: Array.isArray(project.software) ? project.software : [],
    technologies: Array.isArray(project.technologies) ? project.technologies : [],
    results: Array.isArray(project.results) ? project.results : [],
    content: (() => {
      const c = project.content;
      if (typeof c === "string") return c;
      if (c && typeof c === "object" && typeof c.html === "string") return c.html;
      return "";
    })(),
    isPublished: Boolean(project.isPublished),
    publishedAt: project.publishedAt,
    order: project.order || 0,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}

function parseOptionalDateTime(value) {
  if (value === undefined) return { skip: true };
  if (value === null || value === "") return { value: null };

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "La fecha de publicación no es válida" };
  }

  return { value: parsed };
}

function isAdmin(req) {
  return req.user && req.user.role === Role.ADMIN;
}

function isUnknownTechnologiesArgError(error) {
  return String(error?.message || "").includes("Unknown argument `technologies`");
}

function stripUnsupportedPortfolioFields(fields) {
  if (!fields || typeof fields !== "object" || !("technologies" in fields)) return fields;
  const { technologies, ...rest } = fields;
  return rest;
}

async function createPortfolioProjectSafe(data) {
  try {
    return await prisma.portfolioProject.create({ data });
  } catch (error) {
    if (!isUnknownTechnologiesArgError(error)) throw error;
    return prisma.portfolioProject.create({ data: stripUnsupportedPortfolioFields(data) });
  }
}

async function updatePortfolioProjectSafe(id, data) {
  try {
    return await prisma.portfolioProject.update({ where: { id }, data });
  } catch (error) {
    if (!isUnknownTechnologiesArgError(error)) throw error;
    return prisma.portfolioProject.update({ where: { id }, data: stripUnsupportedPortfolioFields(data) });
  }
}

async function listCategories(_req, res, next) {
  try {
    const categories = await prisma.portfolioCategory.findMany({
      orderBy: [{ order: "asc" }, { label: "asc" }]
    });
    return res.json({ categories });
  } catch (error) {
    return next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const label = String(req.body?.label || "").trim();
    const icon = String(req.body?.icon || "").trim();
    if (!label) return res.status(400).json({ error: "label es requerido" });
    if (!icon) return res.status(400).json({ error: "icon es requerido" });

    const providedSlug = String(req.body?.slug || "").trim();
    let slug = providedSlug ? slugify(providedSlug) : slugify(label);
    const existing = await prisma.portfolioCategory.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: "Ya existe una categoria con ese slug" });

    const order = Number.isFinite(Number(req.body?.order)) ? Number(req.body.order) : 0;

    const category = await prisma.portfolioCategory.create({
      data: { slug, label, icon, order }
    });
    return res.status(201).json({ category });
  } catch (error) {
    return next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "id invalido" });

    const data = {};
    if (typeof req.body?.label === "string") data.label = req.body.label.trim();
    if (typeof req.body?.icon === "string") data.icon = req.body.icon.trim();
    if (req.body?.order !== undefined && Number.isFinite(Number(req.body.order))) {
      data.order = Number(req.body.order);
    }
    if (typeof req.body?.slug === "string" && req.body.slug.trim()) {
      const newSlug = slugify(req.body.slug);
      const clash = await prisma.portfolioCategory.findUnique({ where: { slug: newSlug } });
      if (clash && clash.id !== id) {
        return res.status(409).json({ error: "Ya existe una categoria con ese slug" });
      }
      data.slug = newSlug;
    }

    const category = await prisma.portfolioCategory.update({ where: { id }, data });
    return res.json({ category });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Categoria no encontrada" });
    return next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "id invalido" });
    await prisma.portfolioCategory.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Categoria no encontrada" });
    return next(error);
  }
}

async function listProjects(req, res, next) {
  try {
    await publishDuePortfolioProjects();
    const showAll = isAdmin(req) && req.query.all === "true";
    const where = showAll ? {} : { isPublished: true };
    const projects = await prisma.portfolioProject.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }]
    });
    return res.json({ projects: projects.map(normalizeProject) });
  } catch (error) {
    return next(error);
  }
}

async function getProject(req, res, next) {
  try {
    await publishDuePortfolioProjects();
    const slug = String(req.params.slug || "").trim();
    if (!slug) return res.status(400).json({ error: "slug es requerido" });
    const project = await prisma.portfolioProject.findUnique({ where: { slug } });
    if (!project) return res.status(404).json({ error: "Proyecto no encontrado" });
    if (!project.isPublished && !isAdmin(req)) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }
    return res.json({ project: normalizeProject(project) });
  } catch (error) {
    return next(error);
  }
}

function extractProjectFields(body) {
  const data = {};
  if (typeof body?.title === "string") data.title = body.title.trim();
  if (typeof body?.client === "string") data.client = body.client.trim() || null;
  if (typeof body?.date === "string") data.date = body.date.trim() || null;
  if (typeof body?.summary === "string") data.summary = body.summary.trim();
  if (typeof body?.approach === "string") data.approach = body.approach.trim();
  if (typeof body?.budget === "string") data.budget = body.budget.trim() || null;
  if (typeof body?.aspectRatio === "string") data.aspectRatio = body.aspectRatio.trim() || "4/3";
  if (typeof body?.liveUrl === "string") data.liveUrl = body.liveUrl.trim() || null;
  if (typeof body?.showBrowserFrame === "boolean") data.showBrowserFrame = body.showBrowserFrame;
  if (typeof body?.coverUrl === "string" || body?.coverUrl === null) {
    data.coverUrl = body.coverUrl ? String(body.coverUrl).trim() : null;
  }
  if (Array.isArray(body?.categories)) {
    data.categories = body.categories
      .map((c) => String(c || "").trim())
      .filter(Boolean);
  }
  if (Array.isArray(body?.software)) {
    data.software = body.software
      .filter((s) => s && typeof s === "object")
      .map((s) => ({
        id: String(s.id || "").trim() || null,
        icon: String(s.icon || "").trim() || null,
        name: String(s.name || "").trim(),
        abbr: String(s.abbr || "").trim().slice(0, 4)
      }))
      .filter((s) => s.name);
  }
  if (Array.isArray(body?.technologies)) {
    data.technologies = body.technologies
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id || "").trim() || null,
        name: String(item.name || "").trim(),
        kind: String(item.kind || "").trim() || null
      }))
      .filter((item) => item.name);
  }
  if (Array.isArray(body?.results)) {
    data.results = body.results
      .filter((r) => r && typeof r === "object")
      .map((r) => ({ value: String(r.value || "").trim(), label: String(r.label || "").trim() }))
      .filter((r) => r.value || r.label);
  }
  if (typeof body?.content === "string") {
    data.content = { html: body.content };
  }
  if (typeof body?.isPublished === "boolean") data.isPublished = body.isPublished;
  if (Object.hasOwn(body || {}, "publishedAt")) {
    const publishedAt = parseOptionalDateTime(body.publishedAt);
    if (publishedAt.error) {
      throw new Error(publishedAt.error);
    }
    if (!publishedAt.skip) {
      data.publishedAt = publishedAt.value;
    }
  }
  if (Number.isFinite(Number(body?.order))) data.order = Number(body.order);
  return data;
}

async function createProject(req, res, next) {
  try {
    const fields = extractProjectFields(req.body);
    if (!fields.title) return res.status(400).json({ error: "title es requerido" });
    if (!fields.summary) return res.status(400).json({ error: "summary es requerido" });

    const baseSlug = req.body?.slug ? slugify(req.body.slug) : slugify(fields.title);
    const slug = await ensureUniqueSlug(baseSlug);
    if (fields.isPublished) {
      fields.publishedAt = new Date();
    }

    const project = await createPortfolioProjectSafe({ slug, ...fields });
    return res.status(201).json({ project: normalizeProject(project) });
  } catch (error) {
    if (error?.message === "La fecha de publicación no es válida") {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
}

async function updateProject(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "id invalido" });

    const existing = await prisma.portfolioProject.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Proyecto no encontrado" });

    const fields = extractProjectFields(req.body);

    if (typeof req.body?.slug === "string" && req.body.slug.trim()) {
      const nextSlug = await ensureUniqueSlug(slugify(req.body.slug), id);
      fields.slug = nextSlug;
    }

    if (fields.isPublished === true) {
      fields.publishedAt = new Date();
    } else if (fields.isPublished === false && !Object.hasOwn(fields, "publishedAt")) {
      fields.publishedAt = null;
    } else if (
      fields.isPublished === false
      && fields.publishedAt
      && fields.publishedAt.getTime() <= Date.now()
    ) {
      fields.isPublished = true;
    }

    const project = await updatePortfolioProjectSafe(id, fields);
    return res.json({ project: normalizeProject(project) });
  } catch (error) {
    if (error?.message === "La fecha de publicación no es válida") {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
}

async function deleteProject(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "id invalido" });
    await prisma.portfolioProject.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Proyecto no encontrado" });
    return next(error);
  }
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
};
