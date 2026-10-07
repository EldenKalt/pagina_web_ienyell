import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const require = createRequire(import.meta.url);
const modulePaths = [
  './adminSummary.js', '../middleware/auth.js',
  '../services/publishingScheduler.js', '../lib/prisma.js',
].map((path) => require.resolve(path));
const savedModules = new Map(modulePaths.map((path) => [path, require.cache[path]]));
const originalSecret = process.env.JWT_SECRET;
let prisma;
let scheduler;
let app;
let user;
let errors;

function token(role = 'ADMIN', enabledFeatures = []) {
  user = { id: 3, role, enabledFeatures, isActive: true, name: 'Synthetic Admin' };
  return jwt.sign({ id: 3 }, process.env.JWT_SECRET, {
    algorithm: 'HS256', issuer: 'ienyell-api', audience: 'ienyell-app', expiresIn: '1h',
  });
}

function pendingRow(id, payload, name = 'Synthetic Customer') {
  return { id, name, payload, receivedAt: new Date('2026-01-01T00:00:00Z') };
}

function reads() {
  return [prisma.portfolioProject.groupBy, prisma.blogPost.groupBy,
    prisma.commissionRequest.groupBy, prisma.commissionRequest.findMany, prisma.waitlistEntry.count];
}

beforeEach(() => {
  process.env.JWT_SECRET = 'synthetic-admin-summary-test-secret';
  user = null;
  errors = [];
  for (const path of modulePaths) delete require.cache[path];
  prisma = {
    user: { findUnique: vi.fn(async () => user) },
    portfolioProject: { groupBy: vi.fn(async () => []) },
    blogPost: { groupBy: vi.fn(async () => []) },
    commissionRequest: {
      groupBy: vi.fn(async () => []),
      findMany: vi.fn(async () => []),
    },
    waitlistEntry: { count: vi.fn(async () => 0) },
  };
  scheduler = {
    publishDueBlogPosts: vi.fn(async () => ({ count: 0 })),
    publishDuePortfolioProjects: vi.fn(async () => ({ count: 0 })),
  };
  for (const [path, exports] of [[modulePaths[3], prisma], [modulePaths[2], scheduler]]) {
    require.cache[path] = { id: path, filename: path, loaded: true, exports };
  }
  app = express();
  app.use('/api/admin', require('./adminSummary.js'));
  app.use((error, _req, res, _next) => {
    errors.push(error);
    res.status(500).json({ error: 'Synthetic server error' });
  });
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  for (const path of modulePaths) {
    if (savedModules.get(path)) require.cache[path] = savedModules.get(path);
    else delete require.cache[path];
  }
});

describe('admin dashboard summary (T003, real authentication)', () => {
  it('S1: derives counters and returns only the allowed pending fields', async () => {
    prisma.portfolioProject.groupBy.mockResolvedValueOnce([
      { isPublished: true, _count: { _all: 3 } }, { isPublished: false, _count: { _all: 2 } },
    ]);
    prisma.blogPost.groupBy.mockResolvedValueOnce([{ isPublished: false, _count: { _all: 7 } }]);
    prisma.commissionRequest.groupBy.mockResolvedValueOnce([
      { status: 'pending', _count: { _all: 2 } }, { status: 'closed', _count: { _all: 7 } },
    ]);
    prisma.commissionRequest.findMany.mockResolvedValueOnce([
      { ...pendingRow('COM-000001', { service: 'Portrait', privateField: 'Synthetic private value' }), email: 'synthetic@example.test' },
      pendingRow('COM-000002', { category: 'Illustration' }, 42),
    ]);
    prisma.waitlistEntry.count.mockResolvedValueOnce(1);
    const result = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${token()}`).expect(200);
    expect(result.body).toEqual({
      portfolio: { total: 5, published: 3 }, blog: { total: 7, published: 0 },
      commissions: { total: 9, pending: 2, latestPending: [
        { id: 'COM-000001', name: 'Synthetic Customer', type: 'Portrait', receivedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'COM-000002', name: '42', type: 'Illustration', receivedAt: '2026-01-01T00:00:00.000Z' },
      ] },
      waitlist: { total: 1 },
    });
    for (const row of result.body.commissions.latestPending) {
      expect(Object.keys(row).sort()).toEqual(['id', 'name', 'type', 'receivedAt'].sort());
      expect(row).not.toHaveProperty('email');
      expect(row).not.toHaveProperty('payload');
    }
  });

  it('S2: maps payload types and caps names and types at 120 characters', async () => {
    prisma.commissionRequest.findMany
      .mockResolvedValueOnce([
        pendingRow('COM-000001', { service: 'Portrait' }),
        pendingRow('COM-000002', { category: ' ', wizard: ' Fiction ' }),
        pendingRow('COM-000003', null), pendingRow('COM-000004', []),
      ])
      .mockResolvedValueOnce([pendingRow('COM-000005', { service: 'x'.repeat(300) }, 'n'.repeat(300))]);
    const authorization = `Bearer ${token()}`;
    const first = await request(app).get('/api/admin/summary').set('Authorization', authorization).expect(200);
    expect(first.body.commissions.latestPending.map((row) => row.type)).toEqual(['Portrait', 'Fiction', null, null]);
    const second = await request(app).get('/api/admin/summary').set('Authorization', authorization).expect(200);
    expect(second.body.commissions.latestPending).toHaveLength(1);
    expect(second.body.commissions.latestPending[0].type).toBe('x'.repeat(120));
    expect(second.body.commissions.latestPending[0].name).toBe('n'.repeat(120));
  });

  it('S3: performs exactly the five specified reads without a transaction', async () => {
    await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${token()}`).expect(200);
    expect(prisma.portfolioProject.groupBy).toHaveBeenCalledExactlyOnceWith({ by: ['isPublished'], _count: { _all: true } });
    expect(prisma.blogPost.groupBy).toHaveBeenCalledExactlyOnceWith({ by: ['isPublished'], _count: { _all: true } });
    expect(prisma.commissionRequest.groupBy).toHaveBeenCalledExactlyOnceWith({ by: ['status'], _count: { _all: true } });
    expect(prisma.commissionRequest.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { status: 'pending' }, orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }], take: 4,
      select: { id: true, name: true, payload: true, receivedAt: true },
    });
    expect(prisma.waitlistEntry.count).toHaveBeenCalledExactlyOnceWith();
    expect(prisma).not.toHaveProperty('$transaction');
  });

  it('S4: awaits both publishers before starting any of the five reads', async () => {
    let finishPortfolio;
    let finishBlog;
    scheduler.publishDuePortfolioProjects.mockReturnValueOnce(new Promise((resolve) => { finishPortfolio = resolve; }));
    scheduler.publishDueBlogPosts.mockReturnValueOnce(new Promise((resolve) => { finishBlog = resolve; }));
    const response = request(app).get('/api/admin/summary').set('Authorization', `Bearer ${token()}`).expect(200).then((result) => result);
    await vi.waitFor(() => {
      expect(scheduler.publishDuePortfolioProjects).toHaveBeenCalledTimes(1);
      expect(scheduler.publishDueBlogPosts).toHaveBeenCalledTimes(1);
    });
    for (const read of reads()) expect(read).not.toHaveBeenCalled();
    finishPortfolio({ count: 0 });
    finishBlog({ count: 0 });
    await response;
    for (const read of reads()) {
      expect(read).toHaveBeenCalledTimes(1);
      for (const publish of Object.values(scheduler)) {
        expect(publish.mock.invocationCallOrder[0]).toBeLessThan(read.mock.invocationCallOrder[0]);
      }
    }
  });

  it.each([
    [null, [], 401], ['CLIENT', [], 403], ['COLABORADOR', [], 403], ['COLABORADOR', ['blog'], 403],
  ])('S5: rejects role %s with features %j before reading or publishing', async (role, features, status) => {
    const response = request(app).get('/api/admin/summary');
    if (role) response.set('Authorization', `Bearer ${token(role, features)}`);
    await response.expect(status);
    for (const method of [...reads(), ...Object.values(scheduler)]) expect(method).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(role ? 1 : 0);
  });

  it('S6: wraps storage errors, preserves their code and hides the original message', async () => {
    prisma.blogPost.groupBy.mockRejectedValueOnce(Object.assign(new Error('SYNTH_SECRET_ARG'), { code: 'P9999' }));
    const result = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${token()}`).expect(500);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Admin summary error');
    expect(errors[0].code).toBe('P9999');
    expect(JSON.stringify(result.body)).not.toContain('SYNTH_SECRET_ARG');
  });

  it('S7: sends Cache-Control no-store', async () => {
    const result = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${token()}`).expect(200);
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it('S8: returns zero counters and an empty pending list for an empty database', async () => {
    const result = await request(app).get('/api/admin/summary').set('Authorization', `Bearer ${token()}`).expect(200);
    expect(result.body).toEqual({
      portfolio: { total: 0, published: 0 }, blog: { total: 0, published: 0 },
      commissions: { total: 0, pending: 0, latestPending: [] }, waitlist: { total: 0 },
    });
  });
});
