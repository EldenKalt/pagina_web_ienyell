import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const require = createRequire(import.meta.url);
const paths = [
  './users.js', './readerProfiles.js', '../controllers/readerProfileController.js',
  '../middleware/auth.js', '../services/publishingScheduler.js', '../lib/prisma.js',
].map((path) => require.resolve(path));
const saved = new Map(paths.map((path) => [path, require.cache[path]]));
const originalSecret = process.env.JWT_SECRET;
let prisma;
let app;
let account;
let article;
let notes;
let comments;
let redirects;

const token = () => jwt.sign({ id: 5 }, process.env.JWT_SECRET, {
  algorithm: 'HS256', issuer: 'ienyell-api', audience: 'ienyell-app', expiresIn: '1h',
});
const auth = () => ({ Authorization: `Bearer ${token()}` });
const target = { id: 17, targetType: 'BLOG_POST', targetId: 7 };

beforeEach(() => {
  process.env.JWT_SECRET = 'reader-profile-test-secret';
  account = { id: 5, name: 'Reader', email: 'reader@example.test', handle: 'reader', pronouns: null,
    socialLinks: [], role: 'CLIENT', isActive: true, enabledFeatures: [] };
  article = { id: 7, slug: 'story', title: 'Story', content: '<p data-paragraph-id="paragraph-one">A sentence.</p>',
    isPublished: true, notesEnabled: true, commentsEnabled: true };
  notes = [
    { id: 'a', targetId: 17, target, userId: 5, user: { name: 'Reader' }, body: 'Public thought', isPublic: true,
      selector: null, paragraphId: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 'b', targetId: 17, target, userId: 5, user: { name: 'Reader' }, body: 'Private thought', isPublic: false,
      selector: null, paragraphId: null, createdAt: new Date(), updatedAt: new Date() },
  ];
  comments = [{ id: 9, targetId: 17, target, userId: 5, user: { name: 'Reader' }, body: 'A comment',
    rootId: null, parentId: null, paragraphId: 'paragraph-one', createdAt: new Date(), _count: { replies: 0, likes: 0 }, likes: [] }];
  redirects = new Map();
  const notesFor = (where) => notes.filter((note) => note.userId === where.userId &&
    (where.isPublic === undefined || note.isPublic === where.isPublic) &&
    (!where.targetId || where.targetId.in.includes(note.targetId)));
  const commentsFor = (where) => comments.filter((comment) => comment.userId === where.userId &&
    (!where.targetId || where.targetId.in.includes(comment.targetId)));
  prisma = {
    user: {
      findUnique: vi.fn(async ({ where }) => where.id === 5 || where.handle === account.handle ? account : null),
      findFirst: vi.fn(async ({ where }) => (where.id === 5 || where.handle === account.handle) && account.isActive ? account : null),
      update: vi.fn(async ({ data }) => { Object.assign(account, data); return account; }),
    },
    profileHandleRedirect: {
      findUnique: vi.fn(async ({ where }) => redirects.has(where.handle) ? { userId: 5, user: account } : null),
      create: vi.fn(async ({ data }) => { redirects.set(data.handle, data.userId); return data; }),
      delete: vi.fn(async ({ where }) => { redirects.delete(where.handle); return {}; }),
    },
    blogPost: { findMany: vi.fn(async ({ where }) => {
      if (where.id?.in && !where.id.in.includes(7)) return [];
      if (where.isPublished && !article.isPublished) return [];
      if (where.notesEnabled && !article.notesEnabled) return [];
      if (where.commentsEnabled && !article.commentsEnabled) return [];
      return [article];
    }) },
    annotationTarget: { findMany: vi.fn(async () => [target]) },
    readerNote: { count: vi.fn(async ({ where }) => notesFor(where).length),
      findMany: vi.fn(async ({ where, skip = 0, take = 50 }) => notesFor(where).slice(skip, skip + take)) },
    blogComment: { count: vi.fn(async ({ where }) => commentsFor(where).length),
      findMany: vi.fn(async ({ where, skip = 0, take = 50 }) => commentsFor(where).slice(skip, skip + take)) },
    readerHighlight: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) },
    wishlistItem: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []),
      upsert: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({ count: 0 })) },
    product: { findFirst: vi.fn(async () => ({ id: 3 })), findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (work) => work(prisma)),
    $queryRaw: vi.fn(async () => []),
  };
  for (const path of paths) delete require.cache[path];
  for (const [path, exports] of [[paths.at(-1), prisma], [paths.at(-2), { publishDueBlogPosts: vi.fn(async () => {}) }]])
    require.cache[path] = { id: path, filename: path, loaded: true, exports };
  app = express(); app.use(express.json());
  app.use('/api/users', require('./users.js'));
  app.use('/api/reader-profiles', require('./readerProfiles.js'));
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

describe('reader profile privacy and settings', () => {
  it('only lets authors with blog permission edit their biography and Patreon URL', async () => {
    await request(app).patch('/api/users/me/profile').send({ bio: 'Biography' }).expect(401);
    await request(app).patch('/api/users/me/profile').set(auth()).send({ bio: 'Biography' }).expect(403);
    account.role = 'COLABORADOR';
    await request(app).patch('/api/users/me/profile').set(auth()).send({ bio: 'Biography' }).expect(403);
    account.enabledFeatures = ['blog'];
    const updated = await request(app).patch('/api/users/me/profile').set(auth())
      .send({ bio: 'Biography', patreonUrl: 'https://www.patreon.com/reader' }).expect(200);
    expect(updated.body.profile).toMatchObject({ bio: 'Biography', canEditAuthor: true });
    await request(app).patch('/api/users/me/profile').set(auth())
      .send({ patreonUrl: 'https://patreon.com.example.test/' }).expect(400);
    await request(app).patch('/api/users/me/profile').set(auth()).send({ bio: 'x'.repeat(1501) }).expect(400);
    account.role = 'ADMIN';
    await request(app).patch('/api/users/me/profile').set(auth()).send({ bio: null, patreonUrl: null }).expect(200);
    expect(account.bio).toBeNull();
  });
  it('keeps private notes in the owner view and sends only published notes publicly', async () => {
    await request(app).get('/api/users/me/notes').expect(401);
    expect((await request(app).get('/api/users/me/notes').set(auth()).expect(200)).body.notes).toHaveLength(2);
    const publicResult = await request(app).get('/api/reader-profiles/reader/notes').expect(200);
    expect(publicResult.body.notes).toHaveLength(1);
    expect(publicResult.body.notes[0]).toMatchObject({ body: 'Public thought', postSlug: 'story' });
    article.isPublished = false;
    expect((await request(app).get('/api/reader-profiles/reader/notes').expect(200)).body.notes).toHaveLength(0);
    expect((await request(app).get('/api/users/me/notes').set(auth()).expect(200)).body.notes).toHaveLength(2);
  });

  it('hides comments of a withdrawn post publicly but retains them for the owner', async () => {
    expect((await request(app).get('/api/reader-profiles/reader/comments').expect(200)).body.comments).toHaveLength(1);
    article.commentsEnabled = false;
    expect((await request(app).get('/api/reader-profiles/reader/comments').expect(200)).body.comments).toHaveLength(0);
    expect((await request(app).get('/api/users/me/comments').set(auth()).expect(200)).body.comments).toHaveLength(1);
  });

  it('uses the same privacy rules in the owner public preview and hides inactive profiles', async () => {
    const preview = await request(app).get('/api/reader-profiles/_self/notes').set(auth()).expect(200);
    expect(preview.body.notes.map((note) => note.body)).toEqual(['Public thought']);
    await request(app).get('/api/reader-profiles/_self/notes').expect(404);
    account.isActive = false;
    await request(app).get('/api/reader-profiles/reader').expect(404);
    await request(app).get('/api/reader-profiles/reader/notes').expect(404);
  });

  it('changes a handle with a redirect and never publishes email', async () => {
    const response = await request(app).patch('/api/users/me/profile').set(auth())
      .send({ handle: 'new-reader', pronouns: 'they/them', socialLinks: [{ label: 'Website', url: 'https://example.test/' }] }).expect(200);
    expect(response.body.profile).toMatchObject({ handle: 'new-reader', pronouns: 'they/them' });
    const old = await request(app).get('/api/reader-profiles/reader').expect(200);
    expect(old.body.redirectTo).toBe('new-reader');
    expect(old.body.profile).not.toHaveProperty('email');
    await request(app).patch('/api/users/me/profile').set(auth())
      .send({ socialLinks: [{ label: 'Unsafe', url: 'javascript:alert(1)' }] }).expect(400);
  });

  it('keeps the wishlist private and rejects inactive products', async () => {
    await request(app).get('/api/users/me/wishlist').expect(401);
    await request(app).put('/api/users/me/wishlist/3').set(auth()).expect(200);
    prisma.product.findFirst.mockResolvedValueOnce(null);
    await request(app).put('/api/users/me/wishlist/4').set(auth()).expect(404);
    await request(app).delete('/api/users/me/wishlist/3').set(auth()).expect(200);
  });

  it('rejects invalid pagination without querying another reader’s records', async () => {
    await request(app).get('/api/users/me/notes?page=0').set(auth()).expect(400);
    await request(app).get('/api/reader-profiles/reader/comments?limit=no').expect(400);
  });
});
