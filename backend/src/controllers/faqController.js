const prisma = require("../lib/prisma");

const FAQ_SELECT = {
  id: true,
  question: true,
  answer: true,
  category: true,
  order: true,
  isActive: true,
  createdAt: true
};

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeOrder(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : 0;
}

function validatePayload(payload, { partial = false } = {}) {
  const data = {};

  if (!partial || Object.hasOwn(payload, "question")) {
    const question = String(payload.question || "").trim();
    if (!question) {
      return { error: "La pregunta es obligatoria" };
    }
    data.question = question;
  }

  if (!partial || Object.hasOwn(payload, "answer")) {
    const answer = String(payload.answer || "").trim();
    if (!answer) {
      return { error: "La respuesta es obligatoria" };
    }
    data.answer = answer;
  }

  if (Object.hasOwn(payload, "category")) {
    const category = String(payload.category || "").trim();
    data.category = category || "General";
  } else if (!partial) {
    data.category = "General";
  }

  if (Object.hasOwn(payload, "order")) {
    data.order = normalizeOrder(payload.order);
  } else if (!partial) {
    data.order = 0;
  }

  if (Object.hasOwn(payload, "isActive") && typeof payload.isActive === "boolean") {
    data.isActive = payload.isActive;
  }

  return { data };
}

async function listFaq(_req, res, next) {
  try {
    const items = await prisma.faqItem.findMany({
      where: { isActive: true },
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" }
      ],
      select: FAQ_SELECT
    });
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
}

async function listFaqAdmin(_req, res, next) {
  try {
    const items = await prisma.faqItem.findMany({
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" }
      ],
      select: FAQ_SELECT
    });
    return res.json({ items });
  } catch (error) {
    return next(error);
  }
}

async function createFaq(req, res, next) {
  try {
    const validation = validatePayload(req.body || {});
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const item = await prisma.faqItem.create({
      data: validation.data,
      select: FAQ_SELECT
    });
    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
}

async function updateFaq(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID de pregunta inválido" });
    }

    const validation = validatePayload(req.body || {}, { partial: true });
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }
    if (!Object.keys(validation.data).length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const item = await prisma.faqItem.update({
      where: { id },
      data: validation.data,
      select: FAQ_SELECT
    });
    return res.json(item);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }
    return next(error);
  }
}

async function toggleFaq(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID de pregunta inválido" });
    }

    const existing = await prisma.faqItem.findUnique({
      where: { id },
      select: { id: true, isActive: true }
    });
    if (!existing) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const item = await prisma.faqItem.update({
      where: { id },
      data: { isActive: !existing.isActive },
      select: FAQ_SELECT
    });
    return res.json(item);
  } catch (error) {
    return next(error);
  }
}

async function deleteFaq(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID de pregunta inválido" });
    }

    const result = await prisma.faqItem.deleteMany({ where: { id } });
    if (!result.count) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listFaq,
  listFaqAdmin,
  createFaq,
  updateFaq,
  toggleFaq,
  deleteFaq
};
