const prisma = require("../lib/prisma");

const QuestionType = {
  TEXT: "TEXT",
  TEXTAREA: "TEXTAREA",
  SELECT: "SELECT",
  CHECKBOX: "CHECKBOX"
};
const QUESTION_TYPES = Object.values(QuestionType);
const OPTION_TYPES = new Set(["SELECT", "CHECKBOX"]);

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeOptions(value) {
  if (!Array.isArray(value)) return null;
  const options = [...new Set(
    value
      .map((option) => String(option || "").trim())
      .filter(Boolean)
  )].slice(0, 50);
  if (options.some((option) => option.length > 120)) return null;
  return options.length ? options : null;
}

async function getProductQuestions(req, res, next) {
  try {
    const productId = parsePositiveInt(req.params.productId);
    if (!productId) return res.status(400).json({ error: "productId inválido" });

    const questions = await prisma.productQuestion.findMany({
      where: { productId },
      orderBy: { order: "asc" }
    });
    return res.json({ questions });
  } catch (error) {
    return next(error);
  }
}

async function createQuestion(req, res, next) {
  try {
    const allowedFields = ["question", "type", "options", "isRequired", "order"];
    const invalidFields = Object.keys(req.body || {}).filter((key) => !allowedFields.includes(key));
    if (invalidFields.length) {
      return res.status(400).json({ error: "Campos de pregunta invalidos" });
    }

    const productId = parsePositiveInt(req.params.productId);
    if (!productId) return res.status(400).json({ error: "productId inválido" });

    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "La pregunta es requerida" });

    const type = req.body?.type ? String(req.body.type).toUpperCase() : "TEXT";
    if (!QUESTION_TYPES.includes(type)) {
      return res.status(400).json({ error: `type debe ser: ${QUESTION_TYPES.join(", ")}` });
    }

    const options = OPTION_TYPES.has(type)
      ? sanitizeOptions(req.body?.options)
      : null;
    if (OPTION_TYPES.has(type) && !options) {
      return res.status(400).json({ error: "options debe incluir al menos una opcion valida" });
    }
    const isRequired = req.body?.isRequired !== false;

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return res.status(404).json({ error: "Producto no encontrado" });

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.productQuestion.count({ where: { productId } });
      return tx.productQuestion.create({
        data: { productId, question, type, options, isRequired, order }
      });
    });
    return res.status(201).json({ question: created });
  } catch (error) {
    return next(error);
  }
}

async function updateQuestion(req, res, next) {
  try {
    const allowedFields = ["question", "type", "options", "isRequired", "order"];
    const payloadKeys = Object.keys(req.body || {});
    if (!payloadKeys.length || payloadKeys.some((key) => !allowedFields.includes(key))) {
      return res.status(400).json({ error: "Campos de pregunta invalidos" });
    }

    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const existing = await prisma.productQuestion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Pregunta no encontrada" });

    const data = {};
    if (req.body?.question !== undefined) {
      const q = String(req.body.question).trim();
      if (!q) return res.status(400).json({ error: "La pregunta es requerida" });
      data.question = q;
    }
    if (req.body?.type !== undefined) {
      const type = String(req.body.type).toUpperCase();
      if (!QUESTION_TYPES.includes(type)) return res.status(400).json({ error: "type inválido" });
      data.type = type;
    }
    if (req.body?.options !== undefined) {
      const options = sanitizeOptions(req.body.options);
      if (!options) return res.status(400).json({ error: "options invalido" });
      data.options = options;
    }
    if (req.body?.isRequired !== undefined) data.isRequired = Boolean(req.body.isRequired);
    if (req.body?.order !== undefined) {
      const order = Number.parseInt(req.body.order, 10);
      if (!Number.isInteger(order) || order < 0) return res.status(400).json({ error: "order invalido" });
      data.order = order;
    }

    const nextType = data.type || existing.type;
    const nextOptions = Object.prototype.hasOwnProperty.call(data, "options") ? data.options : existing.options;
    if (OPTION_TYPES.has(nextType) && !sanitizeOptions(nextOptions)) {
      return res.status(400).json({ error: "options debe incluir al menos una opcion valida" });
    }
    if (!OPTION_TYPES.has(nextType)) {
      data.options = null;
    }

    const updated = await prisma.productQuestion.update({ where: { id }, data });
    return res.json({ question: updated });
  } catch (error) {
    return next(error);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido" });

    const existing = await prisma.productQuestion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Pregunta no encontrada" });

    await prisma.productQuestion.delete({ where: { id } });
    return res.json({ message: "Pregunta eliminada" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProductQuestions, createQuestion, updateQuestion, deleteQuestion };
