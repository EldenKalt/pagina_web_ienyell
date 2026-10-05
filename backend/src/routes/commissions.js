const crypto = require('crypto');
const express = require('express');
const fsPromises = require('fs/promises');
const multer = require('multer');
const path = require('path');
const prisma = require('../lib/prisma');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();
const UPLOAD_ROOT = process.env.COMMISSIONS_UPLOAD_ROOT || path.join(__dirname, '../../uploads');
const TEMP_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'tmp');
const COMMISSIONS_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'commissions');
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const COMMISSION_STATUSES = new Set(['pending', 'reviewing', 'accepted', 'declined', 'closed']);
const RESERVED = new Set(['id', 'status', 'referenceFiles', 'receivedAt', 'updatedAt']);
const VALID_ID = /^COM-[0-9A-F]{6}$/;
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
  limits: { fileSize: 5 * 1024 * 1024, files: 10, fieldSize: 256 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(new Error('Only JPG, PNG and WEBP files are allowed.'));
      return;
    }
    callback(null, true);
  },
});
const uploadReferences = upload.array('references', 10);

function isPlainObject(value) {
  return value !== null && typeof value === 'object'
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}
function stripReserved(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !RESERVED.has(key)));
}
function sanitize(value, depth = 0) {
  if (depth > 5) return null;
  if (typeof value === 'string') return value.replace(/\u0000/g, '').trim().slice(0, 2000);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 50).map(([key, item]) => [
      key.replace(/\u0000/g, '').slice(0, 100), sanitize(item, depth + 1),
    ]));
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  return null;
}
function toCommissionResponse(row) {
  const payload = stripReserved(isPlainObject(row.payload) ? row.payload : {});
  return {
    ...payload, id: row.id, status: row.status,
    contact: isPlainObject(payload.contact) ? payload.contact : { name: row.name, email: row.email },
    referenceFiles: row.referenceFiles,
    receivedAt: new Date(row.receivedAt).toISOString(),
    ...(row.updatedAt && { updatedAt: new Date(row.updatedAt).toISOString() }),
  };
}
function storageError(error, recordId) {
  return Object.assign(new Error('Commission storage error'), { code: error?.code, recordId });
}
function createId() {
  return `COM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
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

router.post('/', rateLimit, (req, res, next) => {
  uploadReferences(req, res, async (uploadError) => {
    let id;
    try {
      if (uploadError) {
        await removeTemporaryFiles(req.files);
        return res.status(400).json({ error: 'The uploaded files are invalid.' });
      }
      let parsed;
      try { parsed = parsePayload(req.body); } catch {
        await removeTemporaryFiles(req.files);
        return res.status(400).json({ error: 'The data field must contain valid JSON.' });
      }
      const sanitized = sanitize(parsed);
      if (!isPlainObject(sanitized)) {
        await removeTemporaryFiles(req.files);
        return res.status(400).json({ error: 'The request data is invalid.' });
      }
      const payload = stripReserved(sanitized);
      const contact = isPlainObject(payload.contact) ? payload.contact : { ...payload };
      const name = typeof contact.name === 'string' ? contact.name : '';
      const email = typeof contact.email === 'string' ? contact.email.toLowerCase() : '';
      if (!name || !email || !(payload.terms === true || contact.terms === true)) {
        await removeTemporaryFiles(req.files);
        return res.status(400).json({ error: 'Name, email and accepted terms are required.' });
      }
      payload.contact = { ...contact, name, email };
      if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 64 * 1024) {
        await removeTemporaryFiles(req.files);
        return res.status(400).json({ error: 'The request data is invalid.' });
      }
      const files = req.files ?? [];
      for (let attempt = 0; attempt < 5; attempt += 1) {
        id = createId();
        try {
          await prisma.commissionRequest.create({ data: {
            id, status: 'pending', name, email, payload,
            referenceFiles: files.map((file) => file.filename),
          } });
          break;
        } catch (error) {
          if (error?.code !== 'P2002' || attempt === 4) throw error;
        }
      }
      if (files.length) {
        const moved = [];
        try {
          await fsPromises.mkdir(path.join(COMMISSIONS_UPLOAD_DIR, id), { recursive: true });
          for (const file of files) {
            await fsPromises.rename(file.path, path.join(COMMISSIONS_UPLOAD_DIR, id, file.filename));
            moved.push(file.filename);
          }
        } catch (error) {
          await removeTemporaryFiles(files);
          try {
            await prisma.commissionRequest.update({ where: { id }, data: { referenceFiles: moved } });
          } catch (updateError) {
            console.error({ id, code: updateError?.code });
          }
          console.error({ id, code: error?.code });
        }
      }
      return res.status(201).json({ success: true, id, message: 'Commission request received' });
    } catch (error) {
      await removeTemporaryFiles(req.files);
      return next(storageError(error, id));
    }
  });
});
router.get('/', ...adminOnly, async (_req, res, next) => {
  try {
    const rows = await prisma.commissionRequest.findMany({ orderBy: { receivedAt: 'desc' } });
    return res.json(rows.map(toCommissionResponse));
  } catch (error) { return next(storageError(error)); }
});
router.get('/:id', ...adminOnly, async (req, res, next) => {
  if (!VALID_ID.test(req.params.id)) return res.status(404).json({ error: 'Commission request not found.' });
  try {
    const row = await prisma.commissionRequest.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: 'Commission request not found.' });
    return res.json(toCommissionResponse(row));
  } catch (error) { return next(storageError(error, req.params.id)); }
});
router.patch('/:id', ...adminOnly, async (req, res, next) => {
  const status = String(req.body?.status || '').trim().toLowerCase();
  if (!COMMISSION_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid commission status.' });
  if (!VALID_ID.test(req.params.id)) return res.status(404).json({ error: 'Commission request not found.' });
  try {
    const row = await prisma.commissionRequest.update({
      where: { id: req.params.id }, data: { status, updatedAt: new Date() },
    });
    return res.json({ commission: toCommissionResponse(row) });
  } catch (error) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Commission request not found.' });
    return next(storageError(error, req.params.id));
  }
});
router.get('/:id/references/:filename', ...adminOnly, async (req, res, next) => {
  const filename = path.basename(req.params.filename || '');
  if (!VALID_ID.test(req.params.id) || filename !== req.params.filename || ['.', '..'].includes(filename)) {
    return res.status(404).json({ error: 'Reference file not found.' });
  }
  try {
    const row = await prisma.commissionRequest.findUnique({ where: { id: req.params.id } });
    if (!row || !row.referenceFiles.includes(filename)) return res.status(404).json({ error: 'Reference file not found.' });
    return res.sendFile(path.join(COMMISSIONS_UPLOAD_DIR, row.id, filename), (error) => {
      if (!error) return;
      if (error.code === 'ENOENT' && !res.headersSent) return res.status(404).json({ error: 'Reference file not found.' });
      return next(storageError(error, row.id));
    });
  } catch (error) { return next(storageError(error, req.params.id)); }
});

module.exports = router;
module.exports.stripReserved = stripReserved;
module.exports.isPlainObject = isPlainObject;
module.exports.toCommissionResponse = toCommissionResponse;
