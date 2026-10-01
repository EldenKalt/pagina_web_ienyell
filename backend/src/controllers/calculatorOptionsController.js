const prisma = require('../lib/prisma');

const MAX_VALUE = 1000000;

function serializeOption(option) {
  return {
    recordId: option.id,
    id: option.key,
    key: option.key,
    label: option.label,
    note: option.note,
    pricingMode: option.pricingMode,
    value: Number(option.value),
    applyTo: option.applyTo,
    isPer: option.isPer,
    minimum: option.minimum == null ? null : Number(option.minimum),
    exclusiveGroup: option.exclusiveGroup,
    isActive: option.isActive,
    createdAt: option.createdAt,
    updatedAt: option.updatedAt,
  };
}

function text(value, limit = 240) {
  const result = String(value ?? '').trim();
  return result ? result.slice(0, limit) : null;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_VALUE ? parsed : null;
}

function customKey(value) {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug ? `custom-${slug.replace(/^custom-/, '')}` : null;
}

function optionData(input, { partial = false } = {}) {
  const data = {};
  if (!partial || input.label !== undefined) {
    const label = text(input.label);
    if (!label) return { error: 'label es requerido' };
    data.label = label;
  }
  if (input.note !== undefined) data.note = text(input.note, 500);
  if (!partial || input.pricingMode !== undefined) {
    const pricingMode = String(input.pricingMode || '').toUpperCase();
    if (!['FIXED', 'PERCENTAGE'].includes(pricingMode)) return { error: 'pricingMode inválido' };
    data.pricingMode = pricingMode;
  }
  if (!partial || input.value !== undefined) {
    const value = number(input.value);
    if (value === null) return { error: 'value debe ser un número entre 0 y 1000000' };
    data.value = value;
  }
  if (input.applyTo !== undefined) {
    const applyTo = String(input.applyTo || '').toLowerCase();
    if (!['base', 'total'].includes(applyTo)) return { error: 'applyTo inválido' };
    data.applyTo = applyTo;
  }
  if (input.isPer !== undefined) data.isPer = Boolean(input.isPer);
  if (input.minimum !== undefined) {
    const minimum = input.minimum === null || input.minimum === '' ? null : number(input.minimum);
    if (minimum === null && input.minimum !== null && input.minimum !== '') return { error: 'minimum inválido' };
    data.minimum = minimum;
  }
  if (input.exclusiveGroup !== undefined) data.exclusiveGroup = text(input.exclusiveGroup, 80);
  if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
  return { data };
}

async function listPublic(_req, res, next) {
  try {
    const options = await prisma.calculatorPriceOption.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: 'asc' }],
    });
    return res.json({ options: options.map(serializeOption) });
  } catch (error) {
    return next(error);
  }
}

async function listAdmin(_req, res, next) {
  try {
    const options = await prisma.calculatorPriceOption.findMany({ orderBy: [{ createdAt: 'asc' }] });
    return res.json({ options: options.map(serializeOption) });
  } catch (error) {
    return next(error);
  }
}

async function createOption(req, res, next) {
  try {
    const parsed = optionData(req.body || {});
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const key = customKey(req.body?.key || parsed.data.label);
    if (!key) return res.status(400).json({ error: 'key o label es requerido' });

    const option = await prisma.calculatorPriceOption.create({ data: { key, ...parsed.data } });
    return res.status(201).json({ option: serializeOption(option) });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Ya existe una variable con esa clave' });
    return next(error);
  }
}

async function updateOption(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id inválido' });
    const parsed = optionData(req.body || {}, { partial: true });
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    if (!Object.keys(parsed.data).length) return res.status(400).json({ error: 'Sin campos para actualizar' });

    const option = await prisma.calculatorPriceOption.update({ where: { id }, data: parsed.data });
    return res.json({ option: serializeOption(option) });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Variable no encontrada' });
    return next(error);
  }
}

module.exports = { listPublic, listAdmin, createOption, updateOption };
