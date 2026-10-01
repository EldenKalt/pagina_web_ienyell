import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import request from 'supertest';

const require = createRequire(import.meta.url);
const routePath = require.resolve('./commissions.js');
const authPath = require.resolve('../middleware/auth.js');
const originalAuthModule = require.cache[authPath];
let temporaryDirectory;

function loadRouter({ authorized = true } = {}) {
  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      authenticateToken: (req, res, next) => {
        if (!authorized) return res.status(401).json({ error: 'Token inválido o expirado' });
        req.user = { role: 'ADMIN' };
        return next();
      },
      authorizeRole: (...roles) => (req, res, next) => (
        roles.includes(req.user?.role)
          ? next()
          : res.status(403).json({ error: 'No tienes permiso para esta acción' })
      ),
    },
  };
  delete require.cache[routePath];
  return require(routePath);
}

function createApp(options) {
  const app = express();
  app.use(express.json());
  app.use('/api/commissions', loadRouter(options));
  return app;
}

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ienyell-commissions-'));
  process.env.COMMISSIONS_DATA_FILE = path.join(temporaryDirectory, 'commissions.json');
  await writeFile(process.env.COMMISSIONS_DATA_FILE, JSON.stringify({
    commissions: [{
      id: 'COM-TEST',
      status: 'pending',
      contact: { name: 'Test artist', email: 'test@example.com' },
      receivedAt: '2026-01-01T00:00:00.000Z',
    }],
  }), 'utf8');
});

afterEach(async () => {
  delete require.cache[routePath];
  if (originalAuthModule) {
    require.cache[authPath] = originalAuthModule;
  } else {
    delete require.cache[authPath];
  }
  delete process.env.COMMISSIONS_DATA_FILE;
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe('commission admin routes', () => {
  it('rejects an unauthenticated request list', async () => {
    await request(createApp({ authorized: false }))
      .get('/api/commissions')
      .expect(401);
  });

  it('lets an administrator change a request status and persists it', async () => {
    const response = await request(createApp())
      .patch('/api/commissions/COM-TEST')
      .send({ status: 'reviewing' })
      .expect(200);

    expect(response.body.commission.status).toBe('reviewing');
    const saved = JSON.parse(await readFile(process.env.COMMISSIONS_DATA_FILE, 'utf8'));
    expect(saved.commissions[0]).toMatchObject({ id: 'COM-TEST', status: 'reviewing' });
    expect(saved.commissions[0].updatedAt).toBeTruthy();
  });

  it('only accepts the statuses used by the admin panel', async () => {
    await request(createApp())
      .patch('/api/commissions/COM-TEST')
      .send({ status: 'not-a-real-status' })
      .expect(400);
  });
});
