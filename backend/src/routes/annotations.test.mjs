import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const require = createRequire(import.meta.url);
const paths = [
  './blog.js', './notes.js', '../controllers/annotationController.js',
  '../middleware/auth.js', '../services/publishingScheduler.js', '../lib/prisma.js',
].map((path) => require.resolve(path));
const saved = new Map(paths.map((path) => [path, require.cache[path]]));
const originalSecret = process.env.JWT_SECRET;
let app;
let prisma;
let activeUser;
let post;
let noteRows;

function token(id = 1) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    algorithm: 'HS256', issuer: 'ienyell-api', audience: 'ienyell-app', expiresIn: '1h',
  });
}
function auth(id = 1) { return { Authorization: `Bearer ${token(id)}` }; }
const target = { id: 11, targetType: 'BLOG_POST', targetId: 7 };

beforeEach(() => {
  process.env.JWT_SECRET = 'synthetic-annotation-test-secret';
  activeUser = { id: 1, role: 'ADMIN', isActive: true, enabledFeatures: [] };
  post = { id: 7, slug: 'story', content: '<p data-paragraph-id="para-one">A repeated quote. A repeated quote.</p>', isPublished: true, notesEnabled: true };
  noteRows = [];
  prisma = {
    user: { findUnique: vi.fn(async ({ where }) => where.id === activeUser?.id ? activeUser : null) },
    blogPost: { findFirst: vi.fn(async () => post), findUnique: vi.fn(async () => post), findMany: vi.fn(async () => [post]) },
    annotationTarget: { findUnique: vi.fn(async () => target), upsert: vi.fn(async () => target) },
    readerNote: {
      findUnique: vi.fn(async ({ where }) => noteRows.find((row) => row.userId === where.userId_requestKey?.userId && row.requestKey === where.userId_requestKey?.requestKey) || null),
      findFirst: vi.fn(async ({ where }) => {
        const row = noteRows.find((item) => item.id === where.id && item.userId === where.userId);
        return row ? { ...row, target } : null;
      }),
      findMany: vi.fn(async ({ where }) => noteRows.filter((row) => row.targetId === where.targetId && (where.userId === undefined || row.userId === where.userId) && (where.isPublic === undefined || row.isPublic === where.isPublic))),
      count: vi.fn(async ({ where }) => noteRows.filter((row) => row.targetId === where.targetId && row.isPublic).length),
      create: vi.fn(async ({ data }) => {
        const row = { id: `note-${noteRows.length + 1}`, ...data, createdAt: new Date(), updatedAt: new Date(), user: { name: 'Reader' } };
        noteRows.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }) => {
        const row = noteRows.find((item) => item.id === where.id && item.userId === where.userId);
        Object.assign(row, data);
        return row;
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const before = noteRows.length;
        noteRows = noteRows.filter((row) => row.id !== where.id || row.userId !== where.userId);
        return { count: before - noteRows.length };
      }),
    },
    readerHighlight: { findMany: vi.fn(async () => []), create: vi.fn(), deleteMany: vi.fn(async () => ({ count: 0 })) },
    $queryRaw: vi.fn(async () => []),
    $transaction: vi.fn(async (work) => work(prisma)),
  };
  for (const path of paths) delete require.cache[path];
  const prismaPath = paths.at(-1);
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prisma };
  const schedulerPath = paths.at(-2);
  require.cache[schedulerPath] = { id: schedulerPath, filename: schedulerPath, loaded: true, exports: { publishDueBlogPosts: vi.fn(async () => {}) } };
  app = express();
  app.use(express.json());
  app.use('/api/blog', require('./blog.js'));
  app.use('/api/notes', require('./notes.js'));
  app.use((_error, _req, res, _next) => res.status(500).json({ error: 'Synthetic server error' }));
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  for (const path of paths) {
    if (saved.get(path)) require.cache[path] = saved.get(path);
    else delete require.cache[path];
  }
});

describe('reader annotations', () => {
  it('keeps personal notes behind authentication and private notes out of the public collection', async () => {
    await request(app).get('/api/blog/story/notes').expect(401);
    const created = await request(app).post('/api/blog/story/notes').set(auth()).set('Idempotency-Key', 'request-123')
      .send({ body: 'Remember this', isPublic: false, anchor: null }).expect(201);
    expect(created.body.note.isPublic).toBe(false);
    expect((await request(app).get('/api/blog/story/public-notes').expect(200)).body.notes).toEqual([]);
    expect((await request(app).get('/api/blog/story/notes').set(auth()).expect(200)).body.notes).toHaveLength(1);
    activeUser = { ...activeUser, id: 2 };
    expect((await request(app).get('/api/blog/story/notes').set(auth(2)).expect(200)).body.notes).toEqual([]);
    await request(app).delete(`/api/notes/${created.body.note.id}`).set(auth(2)).expect(200);
    expect(noteRows).toHaveLength(1);
  });

  it('rejects overlong notes and disabled note posts without creating data', async () => {
    await request(app).post('/api/blog/story/notes').set(auth()).set('Idempotency-Key', 'request-124')
      .send({ body: 'a'.repeat(2501), isPublic: false }).expect(400);
    post.notesEnabled = false;
    await request(app).post('/api/blog/story/notes').set(auth()).set('Idempotency-Key', 'request-125')
      .send({ body: 'Valid', isPublic: false }).expect(404);
    expect(prisma.readerNote.create).not.toHaveBeenCalled();
  });

  it('stores the selected paragraph and exposes public notes after publishing', async () => {
    const anchor = { exact: 'A repeated quote.', prefix: '', suffix: ' A repeated quote.', start: 0, end: 17 };
    const created = await request(app).post('/api/blog/story/notes').set(auth()).set('Idempotency-Key', 'request-126')
      .send({ body: 'A definition', isPublic: true, anchor }).expect(201);
    expect(created.body.note).toMatchObject({ paragraphId: 'para-one', anchor: 'A repeated quote.', isPublic: true });
    const listed = await request(app).get('/api/blog/story/public-notes').expect(200);
    expect(listed.body.notes).toHaveLength(1);
    expect(listed.body.notes[0].body).toBe('A definition');
  });

  it('retries a creation without a duplicate and removes a note from public reading when made private', async () => {
    const payload = { body: 'A reader note', isPublic: true, anchor: null };
    const first = await request(app).post('/api/blog/story/notes').set(auth()).set('Idempotency-Key', 'request-127')
      .send(payload).expect(201);
    const retry = await request(app).post('/api/blog/story/notes').set(auth()).set('Idempotency-Key', 'request-127')
      .send(payload).expect(200);
    expect(retry.body.note.id).toBe(first.body.note.id);
    expect(noteRows).toHaveLength(1);
    await request(app).patch(`/api/notes/${first.body.note.id}`).set(auth())
      .send({ isPublic: false }).expect(200);
    expect((await request(app).get('/api/blog/story/public-notes').expect(200)).body.notes).toEqual([]);
  });
});
