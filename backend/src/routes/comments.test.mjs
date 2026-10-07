import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const require = createRequire(import.meta.url);
const paths = [
  './blog.js', './comments.js', '../controllers/commentController.js',
  '../middleware/auth.js', '../services/publishingScheduler.js', '../lib/prisma.js',
].map((path) => require.resolve(path));
const saved = new Map(paths.map((path) => [path, require.cache[path]]));
const originalSecret = process.env.JWT_SECRET;
const target = { id: 11, targetType: 'BLOG_POST', targetId: 7 };
let prisma;
let app;
let post;
let rows;
let logs;
let role;

function token() {
  return jwt.sign({ id: 1 }, process.env.JWT_SECRET, {
    algorithm: 'HS256', issuer: 'ienyell-api', audience: 'ienyell-app', expiresIn: '1h',
  });
}
const auth = () => ({ Authorization: `Bearer ${token()}` });
const full = (row) => ({ ...row, target, user: row.userId === null ? null : { name: row.userId === 1 ? 'Admin' : 'Reader' },
  parent: row.parentId ? { user: { name: 'Reader' } } : null,
  _count: { replies: rows.filter((item) => item.rootId === row.id).length } });
function matches(row, where) {
  if (where.id?.in && !where.id.in.includes(row.id)) return false;
  if (where.targetId !== undefined && row.targetId !== where.targetId) return false;
  if (where.rootId === null && row.rootId !== null) return false;
  if (where.rootId && row.rootId !== where.rootId) return false;
  if (where.paragraphId && typeof where.paragraphId === 'string' && row.paragraphId !== where.paragraphId) return false;
  if (where.isUnassigned !== undefined && row.isUnassigned !== where.isUnassigned) return false;
  if (where.OR) {
    const matched = where.OR.some((choice) => {
      if (choice.isUnassigned === true) return row.isUnassigned;
      if (choice.paragraphId === null) return row.paragraphId === null;
      if (choice.paragraphId?.in) return choice.paragraphId.in.includes(row.paragraphId);
      if (choice.paragraphId?.notIn) return row.paragraphId !== null && !choice.paragraphId.notIn.includes(row.paragraphId);
      return false;
    });
    if (!matched) return false;
  }
  return true;
}

beforeEach(() => {
  process.env.JWT_SECRET = 'synthetic-comment-test-secret';
  role = 'ADMIN';
  post = { id: 7, slug: 'story', content: '<p data-paragraph-id="paragraph-one">A repeated quote.</p>', isPublished: true, commentsEnabled: true };
  rows = [];
  logs = [];
  prisma = {
    user: { findUnique: vi.fn(async () => ({ id: 1, role, name: 'Admin', isActive: true, enabledFeatures: [] })) },
    blogPost: {
      findFirst: vi.fn(async ({ where }) => (where.slug && where.slug !== post.slug) || (where.id && where.id !== post.id) || (where.isPublished && !post.isPublished) || (where.commentsEnabled && !post.commentsEnabled) ? null : post),
      findUnique: vi.fn(async () => post),
    },
    annotationTarget: { findUnique: vi.fn(async () => target), upsert: vi.fn(async () => target) },
    blogComment: {
      findMany: vi.fn(async ({ where, skip = 0, take }) => rows.filter((row) => matches(row, where)).slice(skip, take ? skip + take : undefined).map(full)),
      count: vi.fn(async ({ where }) => rows.filter((row) => matches(row, where)).length),
      findUnique: vi.fn(async ({ where }) => {
        const row = rows.find((item) => item.id === where.id);
        return row ? full(row) : null;
      }),
      create: vi.fn(async ({ data }) => {
        const row = { id: rows.length + 1, targetId: 11, rootId: null, parentId: null, paragraphId: null,
          isUnassigned: false, createdAt: new Date(), ...data };
        rows.push(row);
        return full(row);
      }),
      update: vi.fn(async ({ where, data }) => {
        const row = rows.find((item) => item.id === where.id);
        Object.assign(row, data);
        return full(row);
      }),
    },
    commentThreadAssignmentLog: { create: vi.fn(async ({ data }) => { logs.push(data); return data; }) },
    $transaction: vi.fn(async (work) => work(prisma)),
    $queryRaw: vi.fn(async () => []),
  };
  for (const path of paths) delete require.cache[path];
  for (const [offset, exports] of [[-1, prisma], [-2, { publishDueBlogPosts: vi.fn(async () => {}) }]]) {
    const path = paths.at(offset);
    require.cache[path] = { id: path, filename: path, loaded: true, exports };
  }
  app = express();
  app.use(express.json());
  app.use('/api/blog', require('./blog.js'));
  app.use('/api/comments', require('./comments.js'));
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

describe('paragraph conversations', () => {
  it('reads publicly, counts replies, and never treats a reply as another top-level row', async () => {
    rows.push({ id: 1, targetId: 11, userId: 2, rootId: null, parentId: null, body: 'A thought',
      paragraphId: 'paragraph-one', isUnassigned: false, createdAt: new Date(), highlight: 'A repeated quote.' });
    rows.push({ id: 2, targetId: 11, userId: 2, rootId: 1, parentId: 1, body: 'A reply',
      paragraphId: null, isUnassigned: false, createdAt: new Date() });
    const list = await request(app).get('/api/blog/story/comments?page=1&limit=3').expect(200);
    expect(list.body).toMatchObject({ total: 2, filteredTotal: 1, page: 1, totalPages: 1 });
    expect(list.body.comments).toHaveLength(1);
    expect(list.body.comments[0]).toMatchObject({ paragraphId: 'paragraph-one', replies: 1 });
    const locations = await request(app).get('/api/blog/story/comment-locations').expect(200);
    expect(locations.body).toMatchObject({ paragraphs: [{ paragraphId: 'paragraph-one', count: 2 }], total: 2 });
    expect((await request(app).get('/api/comments/1/replies').expect(200)).body.replies).toHaveLength(1);
  });

  it('requires a valid session, limits text, and enforces the article switch on the API', async () => {
    await request(app).post('/api/blog/story/comments').send({ body: 'Hello' }).expect(401);
    await request(app).post('/api/blog/story/comments').set(auth()).send({ body: 'a'.repeat(2501) }).expect(400);
    post.commentsEnabled = false;
    await request(app).post('/api/blog/story/comments').set(auth()).send({ body: 'Hello' }).expect(404);
    await request(app).get('/api/blog/story/comments').expect(404);
    expect(rows).toHaveLength(0);
  });

  it('keeps an account-deleted reader’s comment as unattributed text', async () => {
    rows.push({ id: 1, targetId: 11, userId: null, rootId: null, parentId: null, body: 'The original thought',
      paragraphId: 'paragraph-one', isUnassigned: false, createdAt: new Date() });
    rows.push({ id: 2, targetId: 11, userId: 2, rootId: 1, parentId: 1, body: 'The later reply',
      paragraphId: null, isUnassigned: false, createdAt: new Date() });
    const result = await request(app).get('/api/blog/story/comments').expect(200);
    expect(result.body.comments[0]).toMatchObject({ body: 'The original thought', author: null, replies: 1 });
    expect((await request(app).get('/api/comments/1/replies').expect(200)).body.replies[0])
      .toMatchObject({ body: 'The later reply' });
  });

  it('derives the paragraph from a selected quote and keeps replies in its root', async () => {
    const anchor = { exact: 'A repeated quote.', prefix: '', suffix: '', start: 0, end: 17 };
    const created = await request(app).post('/api/blog/story/comments').set(auth())
      .send({ body: 'My idea', anchor }).expect(201);
    expect(created.body.comment).toMatchObject({ highlight: anchor.exact, paragraphId: 'paragraph-one' });
    const reply = await request(app).post(`/api/comments/${created.body.comment.id}/replies`).set(auth())
      .send({ body: 'Agreed' }).expect(201);
    expect(reply.body.reply).toMatchObject({ rootId: created.body.comment.id, parentId: created.body.comment.id });
    expect((await request(app).get('/api/comments/1/replies').expect(200)).body.replies).toHaveLength(1);
  });

  it('preserves a removed paragraph thread and reassigns complete threads atomically with an audit entry', async () => {
    rows.push({ id: 1, targetId: 11, userId: 2, rootId: null, parentId: null, body: 'Context',
      paragraphId: 'deleted-paragraph', paragraphSnapshot: 'Old paragraph', isUnassigned: false, createdAt: new Date() });
    rows.push({ id: 2, targetId: 11, userId: 2, rootId: 1, parentId: 1, body: 'Keep this reply',
      paragraphId: null, isUnassigned: false, createdAt: new Date() });
    const old = await request(app).get('/api/blog/story/comments?placement=previous').expect(200);
    expect(old.body.comments[0]).toMatchObject({ paragraphStatus: 'previous-version', paragraphSnapshot: 'Old paragraph', replies: 1 });
    role = 'CLIENT';
    await request(app).post('/api/blog/admin/7/comment-threads/reassign').set(auth())
      .send({ threadIds: [1], paragraphId: 'paragraph-one' }).expect(403);
    role = 'ADMIN';
    await request(app).post('/api/blog/admin/7/comment-threads/reassign').set(auth())
      .send({ threadIds: [1, 999], paragraphId: 'paragraph-one' }).expect(404);
    expect(rows[0].paragraphId).toBe('deleted-paragraph');
    await request(app).post('/api/blog/admin/7/comment-threads/reassign').set(auth())
      .send({ threadIds: [1], paragraphId: 'paragraph-one' }).expect(200);
    expect(rows[0].paragraphId).toBe('paragraph-one');
    expect(rows[1].rootId).toBe(1);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ threadId: 1, fromParagraphId: 'deleted-paragraph', toParagraphId: 'paragraph-one' });
    await request(app).post('/api/blog/admin/7/comment-threads/reassign').set(auth())
      .send({ threadIds: [1], paragraphId: null }).expect(200);
    expect(rows[0].isUnassigned).toBe(true);
  });

  it('paginates the editorial thread list for batch selection', async () => {
    rows.push({ id: 1, targetId: 11, userId: 2, rootId: null, parentId: null, body: 'First',
      paragraphId: 'paragraph-one', isUnassigned: false, createdAt: new Date() });
    rows.push({ id: 2, targetId: 11, userId: 2, rootId: null, parentId: null, body: 'Second',
      paragraphId: 'paragraph-one', isUnassigned: false, createdAt: new Date() });
    const result = await request(app).get('/api/blog/admin/7/comment-threads?page=2&limit=1').set(auth()).expect(200);
    expect(result.body).toMatchObject({ page: 2, total: 2, totalPages: 2 });
    expect(result.body.threads).toHaveLength(1);
  });
});
