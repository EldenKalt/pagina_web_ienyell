const prisma = require('../lib/prisma');

const KNOWN_WIZARD_IDS = new Set(['authors', 'personal', 'studios', 'fandoms', 'brands', 'uxui', 'nsfw']);
const SAFE_KEY = /^[a-zA-Z0-9_-]{1,80}$/;
const MAX_TEXT_LENGTH = 500;

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function text(value, limit = MAX_TEXT_LENGTH) {
  const result = String(value ?? '').trim();
  return result ? result.slice(0, limit) : null;
}

function cleanOption(input, { requireId = false } = {}) {
  if (!isObject(input)) return null;
  const option = {};
  const id = text(input.id, 80);
  if (requireId && (!id || !SAFE_KEY.test(id))) return null;
  if (id && SAFE_KEY.test(id)) option.id = id;
  const label = text(input.label, 180);
  if (label) option.label = label;
  const description = text(input.description);
  if (description) option.description = description;
  if (typeof input.isActive === 'boolean') option.isActive = input.isActive;
  const priceOptionId = text(input.priceOptionId, 80);
  if (priceOptionId && SAFE_KEY.test(priceOptionId)) option.priceOptionId = priceOptionId;
  const nextStepId = text(input.nextStepId, 80);
  if (nextStepId && SAFE_KEY.test(nextStepId)) option.nextStepId = nextStepId;
  return Object.keys(option).length ? option : null;
}

function cleanOptionMap(input, { checklist = false } = {}) {
  if (!isObject(input)) return undefined;
  const result = {};
  for (const [id, value] of Object.entries(input).slice(0, 120)) {
    if (!SAFE_KEY.test(id) || !isObject(value)) continue;
    const option = cleanOption({ ...value, id });
    if (!option) continue;
    if (checklist) {
      const detail = text(value.detail);
      if (detail) option.detail = detail;
      delete option.priceOptionId;
      delete option.nextStepId;
    }
    delete option.id;
    if (Object.keys(option).length) result[id] = option;
  }
  return Object.keys(result).length ? result : undefined;
}

function cleanAddedOptions(input) {
  if (!Array.isArray(input)) return undefined;
  const seenIds = new Set();
  const options = [];
  for (const value of input.slice(0, 80)) {
    const option = cleanOption(value, { requireId: true });
    if (!option?.label || seenIds.has(option.id)) continue;
    seenIds.add(option.id);
    options.push(option);
  }
  return options.length ? options : undefined;
}

function cleanStepSettings(input) {
  if (!isObject(input)) return undefined;
  const step = {};
  const title = text(input.title, 240);
  const description = text(input.description);
  if (title) step.title = title;
  if (description) step.description = description;
  const options = cleanOptionMap(input.options);
  if (options) step.options = options;
  const items = cleanOptionMap(input.items, { checklist: true });
  if (items) step.items = items;
  const addedOptions = cleanAddedOptions(input.addedOptions);
  if (addedOptions) step.addedOptions = addedOptions;
  return Object.keys(step).length ? step : undefined;
}

function cleanExtraQuestions(input) {
  if (!Array.isArray(input)) return undefined;
  const questions = [];
  const seenIds = new Set();
  for (const value of input.slice(0, 24)) {
    if (!isObject(value)) continue;
    const id = text(value.id, 80);
    const title = text(value.title, 240);
    const beforeStepId = text(value.beforeStepId, 80);
    const type = String(value.type || '');
    if (!id || !title || !beforeStepId || !SAFE_KEY.test(id) || !SAFE_KEY.test(beforeStepId) || seenIds.has(id)) continue;
    if (!['single-select', 'multi-select'].includes(type)) continue;
    const options = cleanAddedOptions(value.options);
    if (!options?.length) continue;
    seenIds.add(id);
    const question = { id, title, beforeStepId, type, options };
    const description = text(value.description);
    if (description) question.description = description;
    if (typeof value.isActive === 'boolean') question.isActive = value.isActive;
    if (type === 'multi-select') {
      const min = Number(value.min);
      const max = Number(value.max);
      if (Number.isInteger(min) && min >= 0 && min <= 80) question.min = min;
      if (Number.isInteger(max) && max >= 1 && max <= 80) question.max = max;
    }
    questions.push(question);
  }
  return questions.length ? questions : undefined;
}

function cleanSettings(input) {
  if (!isObject(input)) return {};
  const settings = {};
  if (typeof input.isActive === 'boolean') settings.isActive = input.isActive;
  const title = text(input.title, 240);
  if (title) settings.title = title;
  if (isObject(input.steps)) {
    const steps = {};
    for (const [id, value] of Object.entries(input.steps).slice(0, 120)) {
      if (!SAFE_KEY.test(id)) continue;
      const step = cleanStepSettings(value);
      if (step) steps[id] = step;
    }
    if (Object.keys(steps).length) settings.steps = steps;
  }
  const extraQuestions = cleanExtraQuestions(input.extraQuestions);
  if (extraQuestions) settings.extraQuestions = extraQuestions;
  return settings;
}

function settingsMap(records) {
  return Object.fromEntries(records.map((record) => [record.wizardId, record.settings || {}]));
}

async function listPublic(_req, res, next) {
  try {
    const records = await prisma.wizardFlowSetting.findMany({ select: { wizardId: true, settings: true } });
    return res.json({ settings: settingsMap(records) });
  } catch (error) {
    return next(error);
  }
}

async function listAdmin(_req, res, next) {
  try {
    const records = await prisma.wizardFlowSetting.findMany({
      select: { wizardId: true, settings: true, updatedAt: true, updatedById: true },
      orderBy: { wizardId: 'asc' },
    });
    return res.json({ settings: settingsMap(records), records });
  } catch (error) {
    return next(error);
  }
}

async function updateWizard(req, res, next) {
  try {
    const wizardId = String(req.params.wizardId || '');
    if (!KNOWN_WIZARD_IDS.has(wizardId)) return res.status(404).json({ error: 'Flujo no encontrado' });
    const settings = cleanSettings(req.body?.settings);
    const record = await prisma.wizardFlowSetting.upsert({
      where: { wizardId },
      update: { settings, updatedById: req.user.id },
      create: { wizardId, settings, updatedById: req.user.id },
      select: { wizardId: true, settings: true, updatedAt: true, updatedById: true },
    });
    return res.json({ record });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listPublic, listAdmin, updateWizard };
