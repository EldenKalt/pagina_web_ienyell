const prisma = require('../lib/prisma');

const RECORD_ID = 'link-in-bio-buttons';
const BUTTON_IDS = [
  'work-with-you',
  'social-media',
  'learn-from-you',
  'support-your-work',
  'read-stories',
  'know-universe',
  'store',
  'know-you',
  'stay-in-touch',
];

function cleanSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!value.buttons || typeof value.buttons !== 'object' || Array.isArray(value.buttons)) return null;

  const buttons = {};
  for (const id of BUTTON_IDS) {
    buttons[id] = typeof value.buttons[id] === 'boolean' ? value.buttons[id] : true;
  }
  return { buttons };
}

async function listPublic(_req, res, next) {
  try {
    const record = await prisma.wizardFlowSetting.findUnique({
      where: { wizardId: RECORD_ID },
      select: { settings: true },
    });
    return res.json({ settings: cleanSettings(record?.settings) });
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
    return res.json({ settings: cleanSettings(record?.settings), record });
  } catch (error) {
    return next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = cleanSettings(req.body?.settings);
    if (!settings) return res.status(400).json({ error: 'Invalid Link-in-Bio button settings.' });

    const record = await prisma.wizardFlowSetting.upsert({
      where: { wizardId: RECORD_ID },
      update: { settings, updatedById: req.user.id },
      create: { wizardId: RECORD_ID, settings, updatedById: req.user.id },
      select: { settings: true, updatedAt: true, updatedById: true },
    });
    return res.json({ settings: cleanSettings(record.settings), record });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listPublic, listAdmin, updateSettings };
