const prisma = require('../lib/prisma');

const RECORD_ID = 'service-catalog';
const KNOWN_WIZARD_IDS = new Set(['authors', 'personal', 'studios', 'fandoms', 'brands', 'uxui', 'nsfw']);
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const SAFE_STEP_ID = /^[a-zA-Z0-9_-]{1,80}$/;
const SAFE_ASSET_PATH = /^\/recursos\/[a-zA-Z0-9_./-]{1,240}$/;
const MAX_FAMILIES = 20;
const MAX_OFFERS = 16;

function cleanText(value, limit) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, limit) : null;
}

function cleanEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const stepId = cleanText(value.stepId, 80);
  const optionId = cleanText(value.optionId, 80);
  if (!stepId || !optionId || !SAFE_STEP_ID.test(stepId) || !SAFE_STEP_ID.test(optionId)) return undefined;
  return { stepId, optionId };
}

function cleanOffer(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = cleanText(value.id, 80)?.toLowerCase();
  const label = cleanText(value.label, 180);
  const wizardId = cleanText(value.wizardId, 80);
  if (!id || !label || !SAFE_ID.test(id) || !KNOWN_WIZARD_IDS.has(wizardId)) return null;

  const offer = { id, label, wizardId };
  const description = cleanText(value.description, 500);
  const entry = cleanEntry(value.entry);
  if (description) offer.description = description;
  if (entry) offer.entry = entry;
  if (typeof value.isActive === 'boolean') offer.isActive = value.isActive;
  return offer;
}

function cleanFamily(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = cleanText(value.id, 80)?.toLowerCase();
  const title = cleanText(value.title, 120);
  if (!id || !title || !SAFE_ID.test(id)) return null;

  const offerIds = new Set();
  const offers = (Array.isArray(value.offers) ? value.offers : [])
    .slice(0, MAX_OFFERS)
    .map(cleanOffer)
    .filter((offer) => offer && !offerIds.has(offer.id) && offerIds.add(offer.id));

  const family = { id, title, offers };
  for (const [field, limit] of [['description', 500], ['ctaTitle', 180], ['ctaDescription', 500]]) {
    const text = cleanText(value[field], limit);
    if (text) family[field] = text;
  }
  const image = cleanText(value.image, 260);
  if (image && SAFE_ASSET_PATH.test(image)) family.image = image;
  if (typeof value.isActive === 'boolean') family.isActive = value.isActive;
  return family;
}

function cleanCatalog(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.families)) return null;
  const ids = new Set();
  const families = value.families
    .slice(0, MAX_FAMILIES)
    .map(cleanFamily)
    .filter((family) => family && !ids.has(family.id) && ids.add(family.id));
  return families.length ? { families } : null;
}

async function listPublic(_req, res, next) {
  try {
    const record = await prisma.wizardFlowSetting.findUnique({
      where: { wizardId: RECORD_ID },
      select: { settings: true },
    });
    return res.json({ catalog: cleanCatalog(record?.settings) });
  } catch (error) {
    return next(error);
  }
}

async function listAdmin(_req, res, next) {
  try {
    const record = await prisma.wizardFlowSetting.findUnique({
      where: { wizardId: RECORD_ID },
      select: { settings: true, updatedAt: true, updatedById: true },
    });
    return res.json({ catalog: cleanCatalog(record?.settings), record });
  } catch (error) {
    return next(error);
  }
}

async function updateCatalog(req, res, next) {
  try {
    const catalog = cleanCatalog(req.body?.catalog);
    if (!catalog) return res.status(400).json({ error: 'Add at least one complete service family before saving.' });
    const record = await prisma.wizardFlowSetting.upsert({
      where: { wizardId: RECORD_ID },
      update: { settings: catalog, updatedById: req.user.id },
      create: { wizardId: RECORD_ID, settings: catalog, updatedById: req.user.id },
      select: { settings: true, updatedAt: true, updatedById: true },
    });
    return res.json({ catalog: cleanCatalog(record.settings), record });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listPublic, listAdmin, updateCatalog };
