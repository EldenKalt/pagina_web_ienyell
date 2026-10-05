import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import request from 'supertest';

const require = createRequire(import.meta.url);
const files = ['./waitlist.js', '../lib/prisma.js', '../middleware/auth.js'].map((file) => require.resolve(file));
const saved = new Map(files.map((file) => [file, require.cache[file]]));
let prisma; let rows; let errors; let app;
const valid = () => ({ name: ' Synthetic Reader ', email: ' Reader@Example.com ', terms: true,
  category: ' Art ', reason: ' Synthetic reason ', newsletter: true });
function createApp({ authorized = true, role = 'ADMIN' } = {}) {
  for (const file of files) delete require.cache[file];
  const auth = {
    authenticateToken: (req, res, next) => {
      if (!authorized) return res.status(401).json({ error: 'Synthetic unauthorized' });
      req.user = { role }; return next();
    },
    authorizeRole: (...roles) => (req, res, next) => roles.includes(req.user?.role)
      ? next() : res.status(403).json({ error: 'Synthetic forbidden' }),
  };
  for (const [file, exports] of [[files[1], prisma], [files[2], auth]]) {
    require.cache[file] = { id: file, filename: file, loaded: true, exports };
  }
  const instance = express(); instance.use(express.json()); instance.use('/api/waitlist', require(files[0]));
  instance.use((error, _req, res, _next) => { errors.push(error); res.status(500).json({ error: 'Synthetic storage failure' }); });
  return instance;
}
beforeEach(() => {
  rows = []; errors = [];
  prisma = { waitlistEntry: {
    create: vi.fn(async ({ data }) => { const row = { ...data, receivedAt: new Date('2026-01-01T00:00:00Z') }; rows.push(row); return row; }),
    findMany: vi.fn(async () => [...rows].sort((a, b) => b.receivedAt - a.receivedAt)),
  } };
  app = createApp();
});
afterEach(() => {
  for (const [file, original] of saved) {
    if (original) require.cache[file] = original; else delete require.cache[file];
  }
});
describe('waitlist in Postgres with an injected Prisma', () => {
  it('W1 creates a normalized entry with a server-owned id and registeredAt default', async () => {
    const result = await request(app).post('/api/waitlist').send(valid()).expect(201);
    expect(result.body).toEqual({ success: true, id: expect.stringMatching(/^WL-[0-9A-F]{6}$/), message: 'Added to waitlist' });
    const data = prisma.waitlistEntry.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ name: 'Synthetic Reader', email: 'reader@example.com', terms: true, newsletter: true, category: 'Art', reason: 'Synthetic reason' });
    expect(new Date(data.registeredAt).toISOString()).toBe(data.registeredAt);
    expect(data).not.toHaveProperty('receivedAt');
  });
  it.each([{ name: '' }, { email: '' }, { terms: 'true' }])('W2 rejects invalid required data %j', async (change) => {
    await request(app).post('/api/waitlist').send({ ...valid(), ...change }).expect(400, { error: 'Name, email and accepted terms are required.' });
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });
  it('W3 removes NUL from name and reason', async () => {
    await request(app).post('/api/waitlist').send({ ...valid(), name: 'Synthetic\u0000 Reader', reason: 'a\u0000b' }).expect(201);
    const data = prisma.waitlistEntry.create.mock.calls[0][0].data;
    expect(data.name).toBe('Synthetic Reader'); expect(data.reason).toBe('ab');
  });
  it('W4 retries a duplicate id once with a new id', async () => {
    vi.spyOn(require('crypto'), 'randomBytes').mockReturnValueOnce(Buffer.from('000001', 'hex')).mockReturnValueOnce(Buffer.from('000002', 'hex'));
    prisma.waitlistEntry.create.mockRejectedValueOnce({ code: 'P2002' });
    await request(app).post('/api/waitlist').send(valid()).expect(201);
    expect(prisma.waitlistEntry.create.mock.calls.map(([query]) => query.data.id)).toEqual(['WL-000001', 'WL-000002']);
  });
  it('W5 stops after five duplicate-id failures', async () => {
    prisma.waitlistEntry.create.mockRejectedValue({ code: 'P2002' });
    await request(app).post('/api/waitlist').send(valid()).expect(500);
    expect(prisma.waitlistEntry.create).toHaveBeenCalledTimes(5); expect(errors[0].code).toBe('P2002');
  });
  it('W6 rejects an unauthenticated list', async () => {
    await request(createApp({ authorized: false })).get('/api/waitlist').expect(401);
    expect(prisma.waitlistEntry.findMany).not.toHaveBeenCalled();
  });
  it('W6 rejects a non-admin list', async () => {
    await request(createApp({ role: 'CLIENT' })).get('/api/waitlist').expect(403);
    expect(prisma.waitlistEntry.findMany).not.toHaveBeenCalled();
  });
  it('W7 lists rows by receivedAt with an ISO date and the contracted fields', async () => {
    rows = [{ ...valid(), id: 'WL-ABC123', registeredAt: '2026-01-01', receivedAt: new Date('2026-01-01T00:00:00Z') },
      { ...valid(), id: 'WL-DEF456', registeredAt: '2026-02-01', receivedAt: new Date('2026-02-01T00:00:00Z') }];
    const result = await request(app).get('/api/waitlist').expect(200);
    expect(prisma.waitlistEntry.findMany).toHaveBeenCalledWith({ orderBy: { receivedAt: 'desc' } });
    expect(result.body.map((entry) => entry.id)).toEqual(['WL-DEF456', 'WL-ABC123']);
    expect(result.body[0].receivedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(Object.keys(result.body[0]).sort()).toEqual(['id', 'category', 'name', 'email', 'terms', 'newsletter', 'reason', 'registeredAt', 'receivedAt'].sort());
  });
  it('W8 wraps Prisma errors without exposing their original message', async () => {
    const error = Object.assign(new Error('SYNTH_SECRET_ARG'), { code: 'P9999' });
    prisma.waitlistEntry.create.mockRejectedValueOnce(error);
    await request(app).post('/api/waitlist').send(valid()).expect(500);
    prisma.waitlistEntry.findMany.mockRejectedValueOnce(error);
    await request(app).get('/api/waitlist').expect(500);
    for (const captured of errors) { expect(captured.message).toBe('Waitlist storage error'); expect(captured.code).toBe('P9999'); }
  });
  it('W9 preserves the five-per-hour limiter for the same IP', async () => {
    for (let i = 0; i < 5; i += 1) await request(app).post('/api/waitlist').send(valid()).expect(201);
    await request(app).post('/api/waitlist').send(valid()).expect(429);
    expect(prisma.waitlistEntry.create).toHaveBeenCalledTimes(5);
  });
});
