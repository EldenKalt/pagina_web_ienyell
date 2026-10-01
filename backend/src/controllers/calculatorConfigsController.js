const prisma = require('../lib/prisma');

const KNOWN_CONFIG_IDS = new Set([
  'portraits',
  'fanart',
  'petPortraits',
  'editorial',
  'studioConceptArt',
  'studioCharacter',
  'studioVisualKey',
  'studioEnvironment',
  'nsfw',
  'merch',
  'worldbuilding',
  'marketing',
  'interiorIllustrations',
  'authorDesign',
]);

const SAFE_KEY = /^[a-zA-Z0-9_-]{1,80}$/;
const SAFE_PRICE_PATH = /^[a-zA-Z0-9_.-]{1,240}$/;
const MAX_TEXT_LENGTH = 240;
const MAX_PRICE = 1000000;

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(value, limit = MAX_TEXT_LENGTH) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, limit) : null;
}

function cleanNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_PRICE ? parsed : null;
}

function cleanOptionOverrides(input) {
  if (!isObject(input)) return undefined;
  const result = {};
  for (const [id, value] of Object.entries(input).slice(0, 80)) {
    if (!SAFE_KEY.test(id) || !isObject(value)) continue;
    const option = {};
    const label = cleanText(value.label);
    if (label) option.label = label;
    if (typeof value.isActive === 'boolean') option.isActive = value.isActive;
    if (Object.keys(option).length) result[id] = option;
  }
  return Object.keys(result).length ? result : undefined;
}

function cleanDimensionOverrides(input) {
  if (!isObject(input)) return undefined;
  const result = {};
  for (const [id, value] of Object.entries(input).slice(0, 40)) {
    if (!SAFE_KEY.test(id) || !isObject(value)) continue;
    const dimension = {};
    const label = cleanText(value.label);
    if (label) dimension.label = label;
    const options = cleanOptionOverrides(value.options);
    if (options) dimension.options = options;
    if (Object.keys(dimension).length) result[id] = dimension;
  }
  return Object.keys(result).length ? result : undefined;
}

function cleanAddonOverrides(input) {
  if (!isObject(input)) return undefined;
  const result = {};
  for (const [id, value] of Object.entries(input).slice(0, 80)) {
    if (!SAFE_KEY.test(id) || !isObject(value)) continue;
    const addon = {};
    for (const field of ['label', 'note']) {
      const text = cleanText(value[field]);
      if (text) addon[field] = text;
    }
    for (const field of ['pct', 'amount', 'min']) {
      const number = cleanNumber(value[field]);
      if (number !== null) addon[field] = number;
    }
    if (typeof value.isActive === 'boolean') addon.isActive = value.isActive;
    if (Object.keys(addon).length) result[id] = addon;
  }
  return Object.keys(result).length ? result : undefined;
}

function cleanPriceOverrides(input) {
  if (!isObject(input)) return undefined;
  const result = {};
  for (const [path, value] of Object.entries(input).slice(0, 1200)) {
    if (!SAFE_PRICE_PATH.test(path)) continue;
    const number = cleanNumber(value);
    if (number !== null) result[path] = number;
  }
  return Object.keys(result).length ? result : undefined;
}

function cleanAssignedAddons(input) {
  if (!Array.isArray(input)) return undefined;
  const ids = Array.from(new Set(input
    .map((value) => String(value || '').trim())
    .filter((value) => SAFE_KEY.test(value))))
    .slice(0, 120);
  return ids.length ? ids : undefined;
}

function cleanSettings(input, { allowServices = true } = {}) {
  if (!isObject(input)) return {};
  const settings = {};
  if (typeof input.isActive === 'boolean') settings.isActive = input.isActive;
  const label = cleanText(input.label);
  if (label) settings.label = label;

  const dimensions = cleanDimensionOverrides(input.dimensions);
  if (dimensions) settings.dimensions = dimensions;
  const addons = cleanAddonOverrides(input.addons);
  if (addons) settings.addons = addons;
  const prices = cleanPriceOverrides(input.prices);
  if (prices) settings.prices = prices;
  const assignedAddons = cleanAssignedAddons(input.assignedAddons);
  if (assignedAddons) settings.assignedAddons = assignedAddons;

  if (allowServices && isObject(input.services)) {
    const services = {};
    for (const [serviceId, value] of Object.entries(input.services).slice(0, 30)) {
      if (!SAFE_KEY.test(serviceId)) continue;
      const service = cleanSettings(value, { allowServices: false });
      delete service.isActive;
      if (Object.keys(service).length) services[serviceId] = service;
    }
    if (Object.keys(services).length) settings.services = services;
  }

  return settings;
}

function settingsMap(records) {
  return Object.fromEntries(records.map((record) => [record.configId, record.settings || {}]));
}

async function listPublic(_req, res, next) {
  try {
    const records = await prisma.calculatorConfigSetting.findMany({
      select: { configId: true, settings: true },
    });
    return res.json({ settings: settingsMap(records) });
  } catch (error) {
    return next(error);
  }
}

async function listAdmin(_req, res, next) {
  try {
    const records = await prisma.calculatorConfigSetting.findMany({
      select: { configId: true, settings: true, updatedAt: true, updatedById: true },
      orderBy: { configId: 'asc' },
    });
    return res.json({ settings: settingsMap(records), records });
  } catch (error) {
    return next(error);
  }
}

async function updateConfig(req, res, next) {
  try {
    const configId = String(req.params.configId || '');
    if (!KNOWN_CONFIG_IDS.has(configId)) {
      return res.status(404).json({ error: 'Calculadora no encontrada' });
    }

    const settings = cleanSettings(req.body?.settings);
    const record = await prisma.calculatorConfigSetting.upsert({
      where: { configId },
      update: { settings, updatedById: req.user.id },
      create: { configId, settings, updatedById: req.user.id },
      select: { configId: true, settings: true, updatedAt: true, updatedById: true },
    });
    return res.json({ record });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listPublic, listAdmin, updateConfig };
