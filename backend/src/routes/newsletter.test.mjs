import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import request from 'supertest';

const require = createRequire(import.meta.url);
const paths = [
  './newsletter.js', '../controllers/newsletterController.js', '../lib/prisma.js',
  '../utils/emailHelper.js', '../utils/publicUrl.js',
].map((path) => require.resolve(path));
const saved = new Map(paths.map((path) => [path, require.cache[path]]));
const originalSecret = process.env.NEWSLETTER_TOKEN_SECRET;
let app;
let subscriber;
let sent;
let emailSucceeds;
let prisma;

function matchWhere(where) {
  if (!subscriber || subscriber.id !== where.id) return false;
  if (where.OR && !where.OR.some((condition) => condition.lastRequestAt === null
    ? subscriber.lastRequestAt === null : subscriber.lastRequestAt < condition.lastRequestAt.lt)) return false;
  if (where.lastRequestAt && subscriber.lastRequestAt?.getTime() !== where.lastRequestAt.getTime()) return false;
  if (where.confirmationTokenHash && subscriber.confirmationTokenHash !== where.confirmationTokenHash) return false;
  if (where.confirmationExpiresAt && !(subscriber.confirmationExpiresAt > where.confirmationExpiresAt.gt)) return false;
  if (where.confirmedAt === null && subscriber.confirmedAt !== null) return false;
  if (where.unsubscribedAt === null && subscriber.unsubscribedAt !== null) return false;
  return true;
}

beforeEach(() => {
  process.env.NEWSLETTER_TOKEN_SECRET = 'newsletter-test-secret-with-at-least-thirty-two-bytes';
  subscriber = null; sent = []; emailSucceeds = true;
  prisma = { newsletterSubscriber: {
    findUnique: vi.fn(async ({ where }) => subscriber?.email === where.email ? subscriber : null),
    create: vi.fn(async ({ data }) => {
      subscriber = { id: 1, ...data, confirmationTokenHash: null, confirmationExpiresAt: null,
        lastRequestAt: null, confirmedAt: null, unsubscribedAt: null };
      return subscriber;
    }),
    updateMany: vi.fn(async ({ where, data }) => {
      if (!matchWhere(where)) return { count: 0 };
      Object.assign(subscriber, data);
      return { count: 1 };
    }),
  } };
  for (const path of paths) delete require.cache[path];
  const mocks = [
    [paths[2], prisma],
    [paths[3], { renderEmailLayout: ({ contentHtml }) => contentHtml,
      sendEmail: vi.fn(async (mail) => { sent.push(mail); return emailSucceeds; }) }],
    [paths[4], { buildFrontendUrl: (path) => `https://example.test${path}` }],
  ];
  for (const [path, exports] of mocks) require.cache[path] = { id: path, filename: path, loaded: true, exports };
  app = express(); app.set('trust proxy', 1); app.use(express.json());
  app.use('/api/newsletter', require('./newsletter.js'));
  app.use((_error, _req, res, _next) => res.status(500).json({ error: 'Synthetic error' }));
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.NEWSLETTER_TOKEN_SECRET;
  else process.env.NEWSLETTER_TOKEN_SECRET = originalSecret;
  for (const path of paths) {
    if (saved.get(path)) require.cache[path] = saved.get(path);
    else delete require.cache[path];
  }
});

function tokenFromMail(action) {
  const match = sent.at(-1).html.match(new RegExp(`newsletter/${action}\\?token=([^"&]+)`));
  return match && decodeURIComponent(match[1]);
}

describe('newsletter subscription', () => {
  it('validates email and confirms only once with a matching signed token', async () => {
    await request(app).post('/api/newsletter/subscribe').send({ email: 'bad' }).expect(400);
    const subscribed = await request(app).post('/api/newsletter/subscribe').send({ email: ' Reader@Example.Test ' }).expect(201);
    expect(subscribed.body.success).toBe(true);
    expect(subscriber.email).toBe('reader@example.test');
    expect(sent[0].html).toContain('newsletter/unsubscribe?token=');
    const token = tokenFromMail('confirm');
    expect(token).toBeTruthy();
    await request(app).post('/api/newsletter/confirm').send({ token: `${token}x` }).expect(400);
    await request(app).post('/api/newsletter/confirm').send({ token }).expect(200);
    expect(subscriber.confirmedAt).toBeInstanceOf(Date);
    await request(app).post('/api/newsletter/confirm').send({ token }).expect(400);
  });

  it('returns the same public result for a repeat request and cools down email', async () => {
    const first = await request(app).post('/api/newsletter/subscribe').send({ email: 'reader@example.test' }).expect(201);
    const again = await request(app).post('/api/newsletter/subscribe').send({ email: 'reader@example.test' }).expect(201);
    expect(again.body).toEqual(first.body);
    expect(sent).toHaveLength(1);
    subscriber.lastRequestAt = new Date(Date.now() - 16 * 60 * 1000);
    await request(app).post('/api/newsletter/subscribe').send({ email: 'reader@example.test' }).expect(201);
    expect(sent).toHaveLength(2);
    expect(tokenFromMail('confirm')).toBeTruthy();
  });

  it('unsubscribes with a separate token and blocks pending confirmation', async () => {
    await request(app).post('/api/newsletter/subscribe').send({ email: 'reader@example.test' }).expect(201);
    const confirmation = tokenFromMail('confirm');
    const unsubscribe = tokenFromMail('unsubscribe');
    await request(app).post('/api/newsletter/unsubscribe').send({ token: confirmation }).expect(400);
    await request(app).post('/api/newsletter/unsubscribe').send({ token: unsubscribe }).expect(200);
    await request(app).post('/api/newsletter/unsubscribe').send({ token: unsubscribe }).expect(200);
    await request(app).post('/api/newsletter/confirm').send({ token: confirmation }).expect(400);
    expect(subscriber.unsubscribedAt).toBeInstanceOf(Date);
  });

  it('allows retry when mail delivery fails', async () => {
    emailSucceeds = false;
    await request(app).post('/api/newsletter/subscribe').send({ email: 'reader@example.test' }).expect(503);
    expect(subscriber.lastRequestAt).toBeNull();
    emailSucceeds = true;
    await request(app).post('/api/newsletter/subscribe').send({ email: 'reader@example.test' }).expect(201);
    expect(sent).toHaveLength(2);
  });

  it('limits repeated requests from one IP', async () => {
    for (let attempt = 0; attempt < 20; attempt += 1)
      await request(app).post('/api/newsletter/subscribe').send({ email: 'bad' }).expect(400);
    await request(app).post('/api/newsletter/subscribe').send({ email: 'bad' }).expect(429);
  });
});
