const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const fsPromises = require('fs/promises');
const multer = require('multer');
const path = require('path');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();
const DATA_FILE = process.env.COMMISSIONS_DATA_FILE || path.join(__dirname, '../../data/commissions.json');
const TEMP_UPLOAD_DIR = path.join(__dirname, '../../uploads/tmp');
const COMMISSIONS_UPLOAD_DIR = path.join(__dirname, '../../uploads/commissions');
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const COMMISSION_STATUSES = new Set(['pending', 'reviewing', 'accepted', 'declined', 'closed']);
const adminOnly = [authenticateToken, authorizeRole('ADMIN')];

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, TEMP_UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    callback(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(new Error('Only JPG, PNG and WEBP files are allowed.'));
      return;
    }
    callback(null, true);
  },
});

function sanitize(value, depth = 0) {
  if (depth > 5) return null;
  if (typeof value === 'string') return value.trim().slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [key.slice(0, 100), sanitize(item, depth + 1)]));
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  return null;
}

async function readCommissions() {
  try {
    const parsed = JSON.parse(await fsPromises.readFile(DATA_FILE, 'utf8'));
    return Array.isArray(parsed.commissions) ? parsed.commissions : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeCommissions(commissions) {
  await fsPromises.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const temporaryFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fsPromises.writeFile(temporaryFile, `${JSON.stringify({ commissions }, null, 2)}\n`, 'utf8');
  await fsPromises.rename(temporaryFile, DATA_FILE);
}

function createId(commissions) {
  let id;
  do {
    id = `COM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  } while (commissions.some((commission) => commission.id === id));
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
  if (entry.count >= RATE_LIMIT_MAX) return res.status(429).json({ error: 'Too many commission requests. Please try again later.' });
  entry.count += 1;
  return next();
}

async function removeTemporaryFiles(files = []) {
  await Promise.all(files.map((file) => fsPromises.unlink(file.path).catch(() => undefined)));
}

function parsePayload(body) {
  if (typeof body?.data === 'string') return JSON.parse(body.data);
  return body ?? {};
}

router.post('/', rateLimit, upload.array('references', 10), async (req, res, next) => {
  try {
    const payload = sanitize(parsePayload(req.body));
    const contact = payload.contact && typeof payload.contact === 'object' ? payload.contact : payload;
    const name = typeof contact.name === 'string' ? contact.name : '';
    const email = typeof contact.email === 'string' ? contact.email.toLowerCase() : '';
    const termsAccepted = payload.terms === true || contact.terms === true;

    if (!name || !email || !termsAccepted) {
      await removeTemporaryFiles(req.files);
      return res.status(400).json({ error: 'Name, email and accepted terms are required.' });
    }

    const commissions = await readCommissions();
    const id = createId(commissions);
    const destination = path.join(COMMISSIONS_UPLOAD_DIR, id);
    const files = req.files ?? [];
    const referenceFiles = [];

    if (files.length > 0) {
      await fsPromises.mkdir(destination, { recursive: true });
      for (const file of files) {
        const target = path.join(destination, file.filename);
        await fsPromises.rename(file.path, target);
        referenceFiles.push(file.filename);
      }
    }

    const commission = {
      id,
      status: 'pending',
      ...payload,
      contact: { ...contact, name, email },
      referenceFiles,
      receivedAt: new Date().toISOString(),
    };
    commissions.push(commission);
    await writeCommissions(commissions);

    return res.status(201).json({ success: true, id, message: 'Commission request received' });
  } catch (error) {
    await removeTemporaryFiles(req.files);
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'The data field must contain valid JSON.' });
    return next(error);
  }
});

router.get('/', ...adminOnly, async (_req, res, next) => {
  try {
    const commissions = await readCommissions();
    commissions.sort((a, b) => new Date(b.receivedAt || b.submittedAt) - new Date(a.receivedAt || a.submittedAt));
    return res.json(commissions);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const commissions = await readCommissions();
    const commission = commissions.find((item) => item.id === req.params.id);
    if (!commission) return res.status(404).json({ error: 'Commission request not found.' });
    return res.json(commission);
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const status = String(req.body?.status || '').trim().toLowerCase();
    if (!COMMISSION_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid commission status.' });
    }

    const commissions = await readCommissions();
    const index = commissions.findIndex((item) => item.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Commission request not found.' });
    }

    const updatedAt = new Date().toISOString();
    commissions[index] = { ...commissions[index], status, updatedAt };
    await writeCommissions(commissions);
    return res.json({ commission: commissions[index] });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/references/:filename', ...adminOnly, async (req, res, next) => {
  try {
    const commissions = await readCommissions();
    const commission = commissions.find((item) => item.id === req.params.id);
    const filename = path.basename(req.params.filename || '');
    if (!commission || !Array.isArray(commission.referenceFiles) || !commission.referenceFiles.includes(filename)) {
      return res.status(404).json({ error: 'Reference file not found.' });
    }

    return res.sendFile(path.join(COMMISSIONS_UPLOAD_DIR, commission.id, filename));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
