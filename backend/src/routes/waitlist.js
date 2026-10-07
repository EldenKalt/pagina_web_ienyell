const crypto = require('crypto');
const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { parsePage, parsePageSize, parseSearch, buildPageMeta } = require('../utils/adminListQuery');

const router = express.Router();
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function sanitizeString(value, maxLength = 2000) {
  return typeof value === 'string' ? value.replace(/\u0000/g, '').trim().slice(0, maxLength) : '';
}

function toWaitlistResponse(row) {
  return {
    id: row.id, category: row.category, name: row.name, email: row.email, terms: row.terms,
    newsletter: row.newsletter, reason: row.reason, registeredAt: row.registeredAt,
    receivedAt: new Date(row.receivedAt).toISOString(),
  };
}
function storageError(error, recordId) {
  return Object.assign(new Error('Waitlist storage error'), { code: error?.code, recordId });
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
  let id;
  try {
    const name = sanitizeString(req.body?.name, 100);
    const email = sanitizeString(req.body?.email, 254).toLowerCase();
    if (!name || !email || req.body?.terms !== true) {
      return res.status(400).json({ error: 'Name, email and accepted terms are required.' });
    }

    const data = {
      category: sanitizeString(req.body.category, 100),
      name,
      email,
      terms: true,
      newsletter: Boolean(req.body.newsletter),
      reason: sanitizeString(req.body.reason, 2000),
      registeredAt: sanitizeString(req.body.registeredAt, 64) || new Date().toISOString(),
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      id = `WL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      try {
        await prisma.waitlistEntry.create({ data: { ...data, id } });
        break;
      } catch (error) {
        if (error?.code !== 'P2002' || attempt === 4) throw error;
      }
    }
    return res.status(201).json({ success: true, id, message: 'Added to waitlist' });
  } catch (error) {
    return next(storageError(error, id));
  }
});

router.get('/', authenticateToken, authorizeRole('ADMIN'), async (req, res, next) => {
  if (!['page', 'pageSize', 'q'].some((key) => Object.hasOwn(req.query, key))) {
    try {
      const rows = await prisma.waitlistEntry.findMany({ orderBy: { receivedAt: 'desc' } });
      return res.json(rows.map(toWaitlistResponse));
    } catch (error) {
      return next(storageError(error));
    }
  }

  const page = parsePage(req.query.page);
  const pageSize = parsePageSize(req.query.pageSize);
  const q = parseSearch(req.query.q);
  const where = {};
  if (q) {
    where.OR = ['name', 'email', 'category'].map((field) => ({ [field]: { contains: q, mode: 'insensitive' } }));
  }
  try {
    const orderBy = [{ receivedAt: 'desc' }, { id: 'desc' }];
    const skip = (page - 1) * pageSize;
    const take = pageSize;
    const [total, rows] = await Promise.all([
      prisma.waitlistEntry.count({ where }),
      prisma.waitlistEntry.findMany({ where, orderBy, skip, take }),
    ]);
    res.set('Cache-Control', 'no-store');
    return res.json({ waitlist: rows.map(toWaitlistResponse), ...buildPageMeta(total, page, pageSize) });
  } catch (error) {
    return next(storageError(error));
  }
});

module.exports = router;
module.exports.toWaitlistResponse = toWaitlistResponse;
