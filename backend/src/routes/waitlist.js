const crypto = require('crypto');
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '../../data/waitlist.json');
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function sanitizeString(value, maxLength = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function readWaitlist() {
  try {
    const parsed = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    return Array.isArray(parsed.waitlist) ? parsed.waitlist : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeWaitlist(waitlist) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const temporaryFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify({ waitlist }, null, 2)}\n`, 'utf8');
  await fs.rename(temporaryFile, DATA_FILE);
}

function createId(waitlist) {
  let id;
  do {
    id = `WL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  } while (waitlist.some((entry) => entry.id === id));
  return id;
}

function rateLimit(req, res, next) {
  const now = Date.now();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const entry = rateLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  if (entry.count >= RATE_LIMIT_MAX) return res.status(429).json({ error: 'Too many waitlist requests. Please try again later.' });
  entry.count += 1;
  return next();
}

router.post('/', rateLimit, async (req, res, next) => {
  try {
    const name = sanitizeString(req.body?.name, 100);
    const email = sanitizeString(req.body?.email, 254).toLowerCase();
    if (!name || !email || req.body?.terms !== true) {
      return res.status(400).json({ error: 'Name, email and accepted terms are required.' });
    }

    const waitlist = await readWaitlist();
    const id = createId(waitlist);
    waitlist.push({
      id,
      category: sanitizeString(req.body.category, 100),
      name,
      email,
      terms: true,
      newsletter: Boolean(req.body.newsletter),
      reason: sanitizeString(req.body.reason, 2000),
      registeredAt: sanitizeString(req.body.registeredAt, 64) || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    });
    await writeWaitlist(waitlist);
    return res.status(201).json({ success: true, id, message: 'Added to waitlist' });
  } catch (error) {
    return next(error);
  }
});

router.get('/', authenticateToken, authorizeRole('ADMIN'), async (_req, res, next) => {
  try {
    const waitlist = await readWaitlist();
    waitlist.sort((a, b) => new Date(b.receivedAt || b.registeredAt) - new Date(a.receivedAt || a.registeredAt));
    return res.json(waitlist);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
