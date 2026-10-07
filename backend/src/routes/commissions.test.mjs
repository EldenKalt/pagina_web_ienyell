import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import request from 'supertest';

const require = createRequire(import.meta.url);
const routePath = require.resolve('./commissions.js');
const prismaPath = require.resolve('../lib/prisma.js');
const authPath = require.resolve('../middleware/auth.js');
const saved = new Map([routePath, prismaPath, authPath].map((file) => [file, require.cache[file]]));
const originalRoot = process.env.COMMISSIONS_UPLOAD_ROOT;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
let root; let rows; let prisma; let errors; let app; let router;

function row(id = 'COM-ABC123', overrides = {}) {
  return { id, status: 'pending', name: 'Synthetic Artist', email: 'artist@example.com',
    payload: { contact: { name: 'Synthetic Artist', email: 'artist@example.com' }, service: 'art', description: 'Synthetic brief' },
    referenceFiles: [], receivedAt: new Date('2026-01-01T00:00:00Z'), updatedAt: null, ...overrides };
}
function payload(overrides = {}) {
  return { contact: { name: ' Synthetic Artist ', email: ' Artist@Example.com ' }, terms: true, ...overrides };
}
function createApp({ authorized = true, role = 'ADMIN' } = {}) {
  for (const file of [routePath, prismaPath, authPath]) delete require.cache[file];
  for (const [file, exports] of [[prismaPath, prisma], [authPath, {
    authenticateToken: (req, res, next) => {
      if (!authorized) return res.status(401).json({ error: 'Synthetic unauthorized' });
      req.user = { role }; return next();
    },
    authorizeRole: (...roles) => (req, res, next) => roles.includes(req.user?.role)
      ? next() : res.status(403).json({ error: 'Synthetic forbidden' }),
  }]]) require.cache[file] = { id: file, filename: file, loaded: true, exports };
  router = require(routePath);
  const instance = express(); instance.use(express.json({ limit: '1mb' }));
  instance.use('/api/commissions', router);
  instance.use((error, _req, res, _next) => { errors.push(error); res.status(500).json({ error: 'Synthetic storage failure' }); });
  return instance;
}
async function expectTmpEmpty() { expect(await fs.readdir(path.join(root, 'tmp'))).toEqual([]); }
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(tmpdir(), 'ienyell-commissions-'));
  await fs.mkdir(path.join(root, 'tmp')); await fs.mkdir(path.join(root, 'commissions'));
  process.env.COMMISSIONS_UPLOAD_ROOT = root; rows = [row()]; errors = [];
  prisma = { commissionRequest: {
    count: vi.fn(async () => rows.length),
    findMany: vi.fn(async () => [...rows].sort((a, b) => b.receivedAt - a.receivedAt)),
    findUnique: vi.fn(async ({ where }) => rows.find((entry) => entry.id === where.id) ?? null),
    create: vi.fn(async ({ data }) => { const created = row(data.id, data); rows.push(created); return created; }),
    update: vi.fn(async ({ where, data }) => {
      const existing = rows.find((entry) => entry.id === where.id);
      if (!existing) throw Object.assign(new Error('Synthetic missing'), { code: 'P2025' });
      Object.assign(existing, data); return existing;
    }),
  } };
  app = createApp();
});
afterEach(async () => {
  for (const [file, original] of saved) {
    if (original) require.cache[file] = original; else delete require.cache[file];
  }
  if (originalRoot === undefined) delete process.env.COMMISSIONS_UPLOAD_ROOT;
  else process.env.COMMISSIONS_UPLOAD_ROOT = originalRoot;
  await fs.rm(root, { recursive: true, force: true });
});

describe('commissions in Postgres with an injected Prisma', () => {
  it('C1 rejects unauthenticated list access', async () => {
    await request(createApp({ authorized: false })).get('/api/commissions').expect(401);
    expect(prisma.commissionRequest.findMany).not.toHaveBeenCalled();
  });
  it('C2 rejects a non-admin list', async () => {
    await request(createApp({ role: 'CLIENT' })).get('/api/commissions').expect(403);
    expect(prisma.commissionRequest.findMany).not.toHaveBeenCalled();
  });
  it('C3 lists two rows by receivedAt with the legacy response shape', async () => {
    rows.push(row('COM-DEF456', { receivedAt: new Date('2026-02-01T00:00:00Z') }));
    const result = await request(app).get('/api/commissions').expect(200);
    expect(result.body.map((entry) => entry.id)).toEqual(['COM-DEF456', 'COM-ABC123']);
    expect(prisma.commissionRequest.findMany).toHaveBeenCalledWith({ orderBy: { receivedAt: 'desc' } });
    expect(result.body[0]).toMatchObject({ receivedAt: '2026-02-01T00:00:00.000Z', contact: rows[0].payload.contact,
      referenceFiles: [], service: 'art', description: 'Synthetic brief' });
  });
  it('C4 retrieves an existing row without a null updatedAt', async () => {
    const result = await request(app).get('/api/commissions/COM-ABC123').expect(200);
    expect(result.body).toMatchObject({ id: 'COM-ABC123', status: 'pending', contact: rows[0].payload.contact });
    expect(result.body).not.toHaveProperty('updatedAt');
  });
  it('C5 returns the contracted missing-row error', async () => {
    await request(app).get('/api/commissions/COM-000000').expect(404, { error: 'Commission request not found.' });
  });
  it.each(['COM-TEST', 'com-abc123', '..%2Fx'])('C6 rejects malformed id %s for all three routes without querying', async (id) => {
    await request(app).get(`/api/commissions/${id}`).expect(404);
    await request(app).patch(`/api/commissions/${id}`).send({ status: 'reviewing' }).expect(404);
    await request(app).get(`/api/commissions/${id}/references/ref.png`).expect(404);
    expect(prisma.commissionRequest.findUnique).not.toHaveBeenCalled();
    expect(prisma.commissionRequest.update).not.toHaveBeenCalled();
  });
  it('C7 normalizes reviewing and stores updatedAt', async () => {
    const result = await request(app).patch('/api/commissions/COM-ABC123').send({ status: ' Reviewing ' }).expect(200);
    expect(result.body.commission.status).toBe('reviewing');
    expect(new Date(result.body.commission.updatedAt).toISOString()).toBe(result.body.commission.updatedAt);
    expect(prisma.commissionRequest.update).toHaveBeenCalledWith({ where: { id: 'COM-ABC123' }, data: { status: 'reviewing', updatedAt: expect.any(Date) } });
  });
  it('C8 rejects an invalid status before an invalid id', async () => {
    await request(app).patch('/api/commissions/COM-TEST').send({ status: 'invalid' }).expect(400, { error: 'Invalid commission status.' });
    expect(prisma.commissionRequest.update).not.toHaveBeenCalled();
  });
  it('C9 maps Prisma P2025 to a 404', async () => {
    prisma.commissionRequest.update.mockRejectedValueOnce({ code: 'P2025' });
    await request(app).patch('/api/commissions/COM-ABC123').send({ status: 'reviewing' }).expect(404);
  });
  it('C10 creates a public JSON request with server-owned fields', async () => {
    const result = await request(app).post('/api/commissions').send(payload()).expect(201);
    expect(result.body).toEqual({ success: true, id: expect.stringMatching(/^COM-[0-9A-F]{6}$/), message: 'Commission request received' });
    expect(prisma.commissionRequest.create.mock.calls[0][0].data).toMatchObject({ status: 'pending', email: 'artist@example.com',
      payload: { contact: { name: 'Synthetic Artist', email: 'artist@example.com' } } });
  });
  it('C11 strips all five reserved payload fields at creation', async () => {
    vi.spyOn(require('crypto'), 'randomBytes').mockReturnValue(Buffer.from('ABC123', 'hex'));
    await request(app).post('/api/commissions').send(payload({ id: 'COM-000000', status: 'accepted', referenceFiles: ['x'], receivedAt: 'x', updatedAt: 'x' })).expect(201);
    const { data } = prisma.commissionRequest.create.mock.calls[0][0];
    expect(data.id).not.toBe('COM-000000'); expect(data.status).toBe('pending');
    for (const key of ['id', 'status', 'referenceFiles', 'receivedAt', 'updatedAt']) expect(data.payload).not.toHaveProperty(key);
  });
  it('C12 serialization protects row fields and supplies contact from columns', () => {
    const result = router.toCommissionResponse(row('COM-ABC123', { payload: { id: 'X', status: 'accepted', receivedAt: 'bad' } }));
    expect(result).toMatchObject({ id: 'COM-ABC123', status: 'pending', receivedAt: '2026-01-01T00:00:00.000Z', contact: { name: 'Synthetic Artist', email: 'artist@example.com' } });
  });
  it.each([{ name: '', email: 'artist@example.com', terms: true }, { name: 'Synthetic Artist', terms: true }, { name: 'Synthetic Artist', email: 'artist@example.com' }])('C13 rejects incomplete contact %j', async (data) => {
    await request(app).post('/api/commissions').send(data).expect(400);
    expect(prisma.commissionRequest.create).not.toHaveBeenCalled();
  });
  it('C14 rejects malformed multipart JSON and removes uploads', async () => {
    await request(app).post('/api/commissions').attach('references', png, 'ref.png').field('data', '{bad').expect(400, { error: 'The data field must contain valid JSON.' });
    expect(prisma.commissionRequest.create).not.toHaveBeenCalled(); await expectTmpEmpty();
  });
  it.each(['null', '[]', '3', '"text"'])('C15 rejects non-object multipart data %s', async (data) => {
    await request(app).post('/api/commissions').field('data', data).expect(400, { error: 'The request data is invalid.' });
    expect(prisma.commissionRequest.create).not.toHaveBeenCalled();
  });
  it.each(['x', 'ñ'])('C16 enforces sanitized UTF-8 byte size for %s and cleans tmp', async (character) => {
    const details = Object.fromEntries(Array.from({ length: character === 'ñ' ? 18 : 40 }, (_, i) => [`field${i}`, character.repeat(2000)]));
    const data = JSON.stringify(payload({ details }));
    if (character === 'ñ') expect(data.length).toBeLessThan(64 * 1024);
    expect(Buffer.byteLength(data, 'utf8')).toBeGreaterThan(64 * 1024);
    await request(app).post('/api/commissions').attach('references', png, 'ref.png').field('data', data).expect(400, { error: 'The request data is invalid.' });
    expect(prisma.commissionRequest.create).not.toHaveBeenCalled(); await expectTmpEmpty();
  });
  it('C17 handles a multer field larger than 256 KB without logging or leaving tmp files', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await request(app).post('/api/commissions').attach('references', png, 'ref.png').field('data', 'x'.repeat(257 * 1024)).expect(400, { error: 'The uploaded files are invalid.' });
    expect(prisma.commissionRequest.create).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled(); await expectTmpEmpty();
  });
  it('C17 handles a rejected image type as a 400 without logging', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await request(app).post('/api/commissions').field('data', JSON.stringify(payload())).attach('references', Buffer.from('synthetic'), 'ref.txt').expect(400, { error: 'The uploaded files are invalid.' });
    expect(log).not.toHaveBeenCalled(); expect(prisma.commissionRequest.create).not.toHaveBeenCalled(); await expectTmpEmpty();
  });
  it('C18 removes NUL from keys and values before storing', async () => {
    await request(app).post('/api/commissions').send({ 'cont\u0000act': { 'na\u0000me': 'Synthetic\u0000 Artist', email: 'artist@exam\u0000ple.com' }, terms: true, nested: ['a\u0000b'] }).expect(201);
    expect(JSON.stringify(prisma.commissionRequest.create.mock.calls[0][0].data)).not.toContain('\\u0000');
  });
  it('C19 retries a collision with a different id', async () => {
    const random = vi.spyOn(require('crypto'), 'randomBytes');
    random.mockReturnValueOnce(Buffer.from('000001', 'hex')).mockReturnValueOnce(Buffer.from('000002', 'hex'));
    prisma.commissionRequest.create.mockRejectedValueOnce({ code: 'P2002' });
    await request(app).post('/api/commissions').send(payload()).expect(201);
    expect(prisma.commissionRequest.create).toHaveBeenCalledTimes(2);
    expect(prisma.commissionRequest.create.mock.calls.map(([query]) => query.data.id)).toEqual(['COM-000001', 'COM-000002']);
  });
  it('C20 stops after five collisions and removes tmp files', async () => {
    prisma.commissionRequest.create.mockRejectedValue({ code: 'P2002' });
    await request(app).post('/api/commissions').attach('references', png, 'ref.png').field('data', JSON.stringify(payload())).expect(500);
    expect(prisma.commissionRequest.create).toHaveBeenCalledTimes(5); await expectTmpEmpty();
  });
  it('C21 wraps create errors without retaining query secrets and cleans tmp', async () => {
    prisma.commissionRequest.create.mockRejectedValueOnce(Object.assign(new Error('SYNTH_SECRET_ARG'), { code: 'P9999' }));
    await request(app).post('/api/commissions').attach('references', png, 'ref.png').field('data', JSON.stringify(payload())).expect(500);
    expect(errors[0].message).toBe('Commission storage error'); expect(errors[0].code).toBe('P9999');
    expect(errors[0].message).not.toContain('SYNTH_SECRET_ARG'); await expectTmpEmpty();
  });
  it('C22 creates before moving two PNG files and keeps multer filenames', async () => {
    const rename = vi.spyOn(require('fs/promises'), 'rename');
    const result = await request(app).post('/api/commissions').field('data', JSON.stringify(payload())).attach('references', png, 'a.png').attach('references', png, 'b.png').expect(201);
    const names = prisma.commissionRequest.create.mock.calls[0][0].data.referenceFiles;
    expect(names).toHaveLength(2); expect(await fs.readdir(path.join(root, 'commissions', result.body.id))).toEqual([...names].sort());
    expect(prisma.commissionRequest.create.mock.invocationCallOrder[0]).toBeLessThan(rename.mock.invocationCallOrder[0]);
    await expectTmpEmpty();
  });
  it('C23 retains only the moved reference after a partial filesystem failure and returns 201', async () => {
    const realRename = require('fs/promises').rename.bind(require('fs/promises'));
    vi.spyOn(require('fs/promises'), 'rename').mockImplementationOnce(realRename).mockRejectedValueOnce(Object.assign(new Error('SYNTH_SECRET_ARG'), { code: 'EACCES' }));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await request(app).post('/api/commissions').field('data', JSON.stringify(payload())).attach('references', png, 'a.png').attach('references', png, 'b.png').expect(201);
    const names = prisma.commissionRequest.create.mock.calls[0][0].data.referenceFiles;
    expect(prisma.commissionRequest.update).toHaveBeenCalledWith({ where: { id: result.body.id }, data: { referenceFiles: [names[0]] } });
    expect(await fs.readdir(path.join(root, 'commissions', result.body.id))).toEqual([names[0]]); await expectTmpEmpty();
    expect(log).toHaveBeenCalledWith({ id: result.body.id, code: 'EACCES' });
  });
  it('C24 serves only a stored safe reference filename', async () => {
    rows[0].referenceFiles = ['ref.png'];
    const directory = path.join(root, 'commissions', rows[0].id); await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, 'ref.png'), png);
    await request(app).get('/api/commissions/COM-ABC123/references/ref.png').expect(200);
    await request(app).get('/api/commissions/COM-ABC123/references/other.png').expect(404);
    prisma.commissionRequest.findUnique.mockClear();
    await request(app).get('/api/commissions/COM-ABC123/references/..%2F..%2Fx').expect(404);
    expect(prisma.commissionRequest.findUnique).not.toHaveBeenCalled();
  });
  it('C25 wraps list errors without exposing their original message', async () => {
    prisma.commissionRequest.findMany.mockRejectedValueOnce(Object.assign(new Error('SYNTH_SECRET_ARG'), { code: 'P9999' }));
    await request(app).get('/api/commissions').expect(500);
    expect(errors[0].message).toBe('Commission storage error'); expect(errors[0].code).toBe('P9999');
  });
});

describe('commissions optional pagination', () => {
  it('CP1 returns the paged contract and shares the same where object', async () => {
    rows.push(row('COM-DEF456', { name: 'Synthetic Second Artist' }));
    prisma.commissionRequest.findMany.mockResolvedValueOnce([rows[1]]);
    const result = await request(app).get('/api/commissions?page=2&pageSize=1').expect(200);
    expect(Object.keys(result.body).sort()).toEqual(['commissions', 'total', 'page', 'pageSize', 'totalPages'].sort());
    expect(result.body).toEqual({ commissions: [router.toCommissionResponse(rows[1])], total: 2, page: 2, pageSize: 1, totalPages: 2 });
    expect(prisma.commissionRequest.count).toHaveBeenCalledExactlyOnceWith({ where: {} });
    expect(prisma.commissionRequest.findMany).toHaveBeenCalledExactlyOnceWith({
      where: {}, orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }], skip: 1, take: 1,
    });
    expect(prisma.commissionRequest.count.mock.calls[0][0].where).toBe(prisma.commissionRequest.findMany.mock.calls[0][0].where);
  });
  it.each([['500', 100], ['abc', 20]])('CP2 normalizes pageSize=%s', async (value, take) => {
    const result = await request(app).get(`/api/commissions?pageSize=${value}`).expect(200);
    expect(prisma.commissionRequest.findMany.mock.calls[0][0].take).toBe(take);
    expect(result.body.pageSize).toBe(take);
    expect(result.body.page).toBe(1);
  });
  it('CP3 searches id, name and email case-insensitively', async () => {
    await request(app).get('/api/commissions?q=Artist').expect(200);
    const where = { OR: ['id', 'name', 'email'].map((field) => ({ [field]: { contains: 'Artist', mode: 'insensitive' } })) };
    expect(prisma.commissionRequest.count).toHaveBeenCalledWith({ where });
    expect(prisma.commissionRequest.findMany.mock.calls[0][0].where).toEqual(where);
    expect(prisma.commissionRequest.count.mock.calls[0][0].where).toBe(prisma.commissionRequest.findMany.mock.calls[0][0].where);
  });
  it('CP4 normalizes Reviewing status', async () => {
    await request(app).get('/api/commissions').query({ status: ' Reviewing ' }).expect(200);
    expect(prisma.commissionRequest.count).toHaveBeenCalledWith({ where: { status: 'reviewing' } });
    expect(prisma.commissionRequest.findMany.mock.calls[0][0].where.status).toBe('reviewing');
  });
  it.each(['all', ''])('CP4 omits the status filter for %j', async (status) => {
    await request(app).get('/api/commissions').query({ status }).expect(200);
    expect(prisma.commissionRequest.count).toHaveBeenCalledWith({ where: {} });
    expect(prisma.commissionRequest.findMany.mock.calls[0][0].where).not.toHaveProperty('status');
  });
  it('CP4 rejects bogus status without calling Prisma', async () => {
    await request(app).get('/api/commissions?status=bogus').expect(400, { error: 'Invalid commission status.' });
    for (const method of Object.values(prisma.commissionRequest)) expect(method).not.toHaveBeenCalled();
  });
  it('CP5 combines status and search with AND', async () => {
    await request(app).get('/api/commissions?status=reviewing&q=x').expect(200);
    const where = { status: 'reviewing', OR: ['id', 'name', 'email'].map((field) => ({ [field]: { contains: 'x', mode: 'insensitive' } })) };
    expect(prisma.commissionRequest.count).toHaveBeenCalledWith({ where });
    expect(prisma.commissionRequest.findMany.mock.calls[0][0].where).toEqual(where);
    expect(prisma.commissionRequest.count.mock.calls[0][0].where).toBe(prisma.commissionRequest.findMany.mock.calls[0][0].where);
  });
  it.each([[{ authorized: false }, 401], [{ role: 'CLIENT' }, 403]])('CP6 authenticates before parsing or querying %j', async (auth, status) => {
    await request(createApp(auth)).get('/api/commissions?page=1&status=bogus').expect(status);
    for (const method of Object.values(prisma.commissionRequest)) expect(method).not.toHaveBeenCalled();
  });
  it('CP7 wraps count errors without exposing their original message', async () => {
    prisma.commissionRequest.count.mockRejectedValueOnce(new Error('SYNTH_SECRET_ARG'));
    const result = await request(app).get('/api/commissions?page=1').expect(500);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Commission storage error');
    expect(JSON.stringify(result.body)).not.toContain('SYNTH_SECRET_ARG');
  });
  it('CP8 orders by receivedAt and id descending', async () => {
    await request(app).get('/api/commissions?page=1').expect(200);
    expect(prisma.commissionRequest.findMany.mock.calls[0][0].orderBy).toEqual([{ receivedAt: 'desc' }, { id: 'desc' }]);
  });
  it('CP9 sets no-store only for paged responses', async () => {
    const paged = await request(app).get('/api/commissions?page=2&pageSize=1').expect(200);
    const legacy = await request(app).get('/api/commissions').expect(200);
    expect(paged.headers['cache-control']).toBe('no-store');
    expect(legacy.headers['cache-control']).toBeUndefined();
    expect(Array.isArray(legacy.body)).toBe(true);
    expect(prisma.commissionRequest.count).toHaveBeenCalledTimes(1);
  });
  it('CP10 ignores an array search while selecting paged mode', async () => {
    const result = await request(app).get('/api/commissions?q=a&q=b').expect(200);
    expect(result.body.pageSize).toBe(20);
    expect(prisma.commissionRequest.count).toHaveBeenCalledWith({ where: {} });
    expect(prisma.commissionRequest.findMany.mock.calls[0][0].where).not.toHaveProperty('OR');
  });
  it('CP11 rejects non-string status without calling Prisma', async () => {
    await request(app).get('/api/commissions?status[]=x').expect(400, { error: 'Invalid commission status.' });
    for (const method of Object.values(prisma.commissionRequest)) expect(method).not.toHaveBeenCalled();
  });
  it('CP12 returns an empty out-of-range page with the real total', async () => {
    prisma.commissionRequest.findMany.mockResolvedValueOnce([]);
    const result = await request(app).get('/api/commissions?page=3&pageSize=1').expect(200);
    expect(result.body).toEqual({ commissions: [], total: 1, page: 3, pageSize: 1, totalPages: 1 });
    expect(prisma.commissionRequest.findMany.mock.calls[0][0].skip).toBe(2);
  });
  it('CP13 wraps paged findMany errors without exposing their original message', async () => {
    prisma.commissionRequest.findMany.mockRejectedValueOnce(new Error('SYNTH_SECRET_ARG'));
    const result = await request(app).get('/api/commissions?page=1').expect(500);
    expect(errors[0].message).toBe('Commission storage error');
    expect(JSON.stringify(result.body)).not.toContain('SYNTH_SECRET_ARG');
  });
  it('CP14 selects paged mode for an empty search', async () => {
    const result = await request(app).get('/api/commissions?q=').expect(200);
    expect(result.body.page).toBe(1);
    expect(prisma.commissionRequest.findMany.mock.calls[0][0].where).toEqual({});
  });
});
