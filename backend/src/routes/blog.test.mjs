import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const require = createRequire(import.meta.url);
const modulePaths = [
  './blog.js', '../controllers/blogController.js', '../middleware/auth.js',
  '../services/publishingScheduler.js', '../lib/prisma.js',
].map((path) => require.resolve(path));
const savedModules = new Map(modulePaths.map((path) => [path, require.cache[path]]));
const originalSecret = process.env.JWT_SECRET;
let prisma;
let app;
let user;
const storedPost = {
  id: 7, title: 'Test article', slug: 'test-article', content: '<p>Safe</p>',
  isPublished: false, publishedAt: null, relatedPostIds: [], relatedProductIds: [], seriesId: null, series: null,
  author: { id: 3, name: 'Test author' },
};

function token(role = 'ADMIN', enabledFeatures = []) {
  user = { id: 3, role, enabledFeatures, isActive: true, name: 'Test author' };
  return jwt.sign({ id: 3 }, process.env.JWT_SECRET, {
    algorithm: 'HS256', issuer: 'ienyell-api', audience: 'ienyell-app', expiresIn: '1h',
  });
}

beforeEach(() => {
  process.env.JWT_SECRET = 'synthetic-blog-test-secret';
  user = null;
  prisma = {
    user: { findUnique: vi.fn(async () => user) },
    blogPost: {
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => ({ ...storedPost })),
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      create: vi.fn(async ({ data }) => ({ ...storedPost, ...data })),
      update: vi.fn(async ({ data }) => ({ ...storedPost, ...data })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    blogSeries: { findUnique: vi.fn(async () => null) },
    blogPostLike: { groupBy: vi.fn(async () => []) },
    annotationTarget: { findMany: vi.fn(async () => []) },
    blogComment: { groupBy: vi.fn(async () => []) },
  };
  for (const path of modulePaths) delete require.cache[path];
  const prismaPath = modulePaths[modulePaths.length - 1];
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prisma };
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/blog', require('./blog.js'));
  app.use((_error, _req, res, _next) => res.status(500).json({ error: 'Synthetic server error' }));
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  for (const path of modulePaths) {
    if (savedModules.get(path)) require.cache[path] = savedModules.get(path);
    else delete require.cache[path];
  }
});

describe('blog write authorization (real middleware)', () => {
  it.each(['post', 'put'])('rejects unauthenticated %s', async (method) => {
    await request(app)[method](method === 'post' ? '/api/blog' : '/api/blog/7')
      .send({ title: 'Test', content: '<p>Safe</p>' }).expect(401);
    expect(prisma.blogPost.create).not.toHaveBeenCalled();
    expect(prisma.blogPost.update).not.toHaveBeenCalled();
  });

  it.each([['CLIENT', []], ['PROVEEDOR', []], ['COLABORADOR', []]])('rejects %s without blog permission', async (role, features) => {
    const authorization = `Bearer ${token(role, features)}`;
    await request(app).post('/api/blog').set('Authorization', authorization)
      .send({ title: 'Test', content: '<p>Safe</p>' }).expect(403);
    await request(app).put('/api/blog/7').set('Authorization', authorization)
      .send({ content: '<p>Safe</p>' }).expect(403);
    expect(prisma.blogPost.create).not.toHaveBeenCalled();
    expect(prisma.blogPost.update).not.toHaveBeenCalled();
  });

  it.each([['ADMIN', []], ['COLABORADOR', ['blog']]])('lets %s create and update with sanitized storage', async (role, features) => {
    const authorization = `Bearer ${token(role, features)}`;
    const created = await request(app).post('/api/blog').set('Authorization', authorization)
      .send({ title: 'Test', content: '<p onmouseover="bad()">Safe</p><script>bad()</script>', isPublished: true }).expect(201);
    expect(created.body).toMatchObject({ id: 7, slug: 'test', isPublished: false, authorId: 3 });
    expect(created.body.content).toMatch(/^<p data-paragraph-id="[a-f0-9-]+">Safe<\/p>$/);
    expect(prisma.blogPost.create.mock.calls[0][0].data.content).toBe(created.body.content);
    const updated = await request(app).put('/api/blog/7').set('Authorization', authorization)
      .send({ content: '<p>Updated<img src="x" onerror="bad()"></p>' }).expect(200);
    expect(updated.body.content).toMatch(/^<p data-paragraph-id="[a-f0-9-]+">Updated<img src="x"><\/p>$/);
    expect(prisma.blogPost.update.mock.calls[0][0].data.content).toBe(updated.body.content);
    expect(updated.body.author).toEqual(storedPost.author);
  });

  it('supports the existing session cookie path', async () => {
    await request(app).post('/api/blog').set('Cookie', `ienyell_session=${token()}`)
      .send({ title: 'Test', content: '<p>Safe</p>' }).expect(201);
  });

  it('rejects an invalid token', async () => {
    await request(app).post('/api/blog').set('Authorization', 'Bearer invalid')
      .send({ title: 'Test', content: '<p>Safe</p>' }).expect(401);
  });
});

describe('blog write validation', () => {
  it.each(['', '<p></p>', '<script>bad()</script>', '<iframe srcdoc="bad"></iframe>', null, {}])('rejects missing or unsafe-only content %j', async (content) => {
    const authorization = `Bearer ${token()}`;
    await request(app).post('/api/blog').set('Authorization', authorization)
      .send({ title: 'Test', content }).expect(400);
    await request(app).put('/api/blog/7').set('Authorization', authorization)
      .send({ content }).expect(400);
    expect(prisma.blogPost.create).not.toHaveBeenCalled();
    expect(prisma.blogPost.update).not.toHaveBeenCalled();
  });

  it('keeps content untouched when updating only metadata', async () => {
    await request(app).put('/api/blog/7').set('Authorization', `Bearer ${token()}`)
      .send({ excerpt: 'Summary' }).expect(200);
    expect(prisma.blogPost.update.mock.calls[0][0].data).toEqual({ excerpt: 'Summary' });
  });

  it.each([{ slug: 'archive' }, { slug: ' ARCHIVE ' }, { title: 'Archive' }])('rejects a reserved explicit or generated slug %j', async (payload) => {
    const authorization = `Bearer ${token()}`;
    await request(app).post('/api/blog').set('Authorization', authorization)
      .send({ title: 'Test', content: '<p>Safe</p>', ...payload }).expect(400);
    await request(app).put('/api/blog/7').set('Authorization', authorization).send(payload).expect(400);
    expect(prisma.blogPost.create).not.toHaveBeenCalled();
    expect(prisma.blogPost.update).not.toHaveBeenCalled();
  });

  it('keeps an existing published slug when changing the title to Archive', async () => {
    prisma.blogPost.findUnique.mockResolvedValueOnce({ ...storedPost, publishedAt: new Date('2026-01-01') });
    await request(app).put('/api/blog/7').set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Archive' }).expect(200);
    expect(prisma.blogPost.update.mock.calls[0][0].data).toEqual({ title: 'Archive' });
  });

  it('preserves unique slug suffixes', async () => {
    prisma.blogPost.findFirst.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);
    const response = await request(app).post('/api/blog').set('Authorization', `Bearer ${token()}`)
      .send({ title: 'Test', content: '<p>Safe</p>' }).expect(201);
    expect(response.body.slug).toBe('test-2');
  });

  it('keeps publish-on-update behavior', async () => {
    const response = await request(app).put('/api/blog/7').set('Authorization', `Bearer ${token()}`)
      .send({ content: '<p onclick="bad()">Safe</p>', isPublished: true }).expect(200);
    expect(response.body.isPublished).toBe(true);
    expect(response.body.publishedAt).toBeTruthy();
    expect(response.body.content).toMatch(/^<p data-paragraph-id="[a-f0-9-]+">Safe<\/p>$/);
  });

  it('rejects invalid IDs, missing posts, empty updates and missing titles', async () => {
    const authorization = `Bearer ${token()}`;
    await request(app).put('/api/blog/invalid').set('Authorization', authorization).send({ title: 'Test' }).expect(400);
    prisma.blogPost.findUnique.mockResolvedValueOnce(null);
    await request(app).put('/api/blog/999').set('Authorization', authorization).send({ title: 'Test' }).expect(404);
    await request(app).put('/api/blog/7').set('Authorization', authorization).send({}).expect(400);
    await request(app).post('/api/blog').set('Authorization', authorization).send({ content: '<p>Safe</p>' }).expect(400);
  });
});

describe('existing public blog contracts', () => {
  it('supplies real author metadata and reading time without sending full bodies in lists', async () => {
    prisma.blogPost.findMany.mockResolvedValueOnce([{ ...storedPost, author: {
      ...storedPost.author, pronouns: 'she/her', bio: 'About the author',
      socialLinks: [{ label: 'Website', url: 'https://example.test' }],
    } }]);
    const response = await request(app).get('/api/blog').expect(200);
    expect(response.body.posts[0]).toMatchObject({ readingTime: 1,
      author: { bio: 'About the author', pronouns: 'she/her', socials: [{ name: 'Website' }] } });
    expect(response.body.posts[0]).not.toHaveProperty('content');
  });
  it('keeps public search/topic filters, identical count conditions, limit cap and scheduler', async () => {
    prisma.blogPost.count.mockResolvedValue(25);
    const response = await request(app).get('/api/blog?page=2&limit=999&search=Test&topic=Art').expect(200);
    expect(response.body).toEqual({ posts: [], total: 25, page: 2, totalPages: 2 });
    const listQuery = prisma.blogPost.findMany.mock.calls[0][0];
    expect(listQuery).toMatchObject({ skip: 24, take: 24 });
    expect(listQuery.where).toEqual({ isPublished: true, keywords: { has: 'Art' }, OR: [
      { title: { contains: 'Test', mode: 'insensitive' } },
      { excerpt: { contains: 'Test', mode: 'insensitive' } },
      { keywords: { has: 'Test' } },
    ] });
    expect(prisma.blogPost.count.mock.calls[0][0].where).toBe(listQuery.where);
    expect(prisma.blogPost.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { isPublished: true } }));
  });

  it('keeps pagination defaults for invalid boundaries', async () => {
    const response = await request(app).get('/api/blog?page=0&limit=-1').expect(200);
    expect(response.body).toEqual({ posts: [], total: 0, page: 1, totalPages: 1 });
    expect(prisma.blogPost.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 6 }));
  });

  it('filters a relational series together with search and topic using the same count conditions', async () => {
    const response = await request(app)
      .get('/api/blog?search=Test&topic=Art&series=Visual%20Rhythm&page=2&limit=4')
      .expect(200);
    expect(response.body).toMatchObject({ total: 0, page: 2, totalPages: 1 });
    const query = prisma.blogPost.findMany.mock.calls[0][0];
    expect(query.where).toEqual({
      isPublished: true,
      keywords: { has: 'Art' },
      series: { is: { name: 'Visual Rhythm' } },
      OR: [
        { title: { contains: 'Test', mode: 'insensitive' } },
        { excerpt: { contains: 'Test', mode: 'insensitive' } },
        { keywords: { has: 'Test' } },
      ],
    });
    expect(prisma.blogPost.count.mock.calls[0][0].where).toBe(query.where);
  });

  it('lists only unique topics from published articles', async () => {
    prisma.blogPost.findMany.mockResolvedValueOnce([
      { keywords: ['Watercolor', 'Painting'] },
      { keywords: ['Drawing', 'Watercolor', ''] },
    ]);
    const response = await request(app).get('/api/blog/topics').expect(200);
    expect(response.body).toEqual({ topics: ['Drawing', 'Painting', 'Watercolor'] });
    expect(prisma.blogPost.findMany).toHaveBeenCalledWith({
      where: { isPublished: true }, select: { keywords: true },
    });
  });

  it('serves a series with published posts in reading order and omits drafts or unrelated featured posts', async () => {
    const olderPost = { id: 2, slug: 'chapter-one', title: 'Chapter one', publishedAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'), keywords: ['Art'] };
    const newerPost = { id: 7, slug: 'chapter-two', title: 'Chapter two', publishedAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-02'), keywords: ['Art'] };
    prisma.blogSeries.findUnique.mockResolvedValueOnce({
      id: 12, name: 'Visual Rhythm', slug: 'visual-rhythm', summary: 'Series summary',
      category: 'Art', goal: 'Teach a skill', audience: 'Artists',
      introPost: { ...olderPost, isPublished: true, seriesId: 12 },
      posts: [olderPost, newerPost],
      featuredPosts: [
        { post: { ...newerPost, isPublished: true, seriesId: 12 } },
        { post: { ...olderPost, isPublished: false, seriesId: 12 } },
        { post: { ...olderPost, isPublished: true, seriesId: 99 } },
      ],
    });
    const response = await request(app).get('/api/blog/series/visual-rhythm').expect(200);
    expect(response.body.series).toMatchObject({
      name: 'Visual Rhythm', slug: 'visual-rhythm', summary: 'Series summary',
      category: 'Art', goal: 'Teach a skill', audience: 'Artists',
      introPost: { id: 2 }, posts: [{ id: 2 }, { id: 7 }], featuredPosts: [{ id: 7 }],
    });
    expect(response.body.series).not.toHaveProperty('id');
    expect(response.body.series.introPost).not.toHaveProperty('isPublished');
    expect(response.body.series.featuredPosts[0]).not.toHaveProperty('seriesId');
    expect(prisma.blogSeries.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'visual-rhythm' } }));
  });

  it('returns 404 for an unknown series', async () => {
    await request(app).get('/api/blog/series/unknown').expect(404);
  });

  it('keeps public detail navigation, recommendations and missing-post response', async () => {
    await request(app).get('/api/blog/missing').expect(404);
    prisma.blogPost.findFirst.mockResolvedValueOnce({ ...storedPost, isPublished: true });
    prisma.blogPost.findMany.mockResolvedValueOnce([{ id: 8, slug: 'previous' }, { id: 7, slug: 'test-article' }, { id: 6, slug: 'next' }]);
    const response = await request(app).get('/api/blog/test-article').expect(200);
    expect(response.body).toMatchObject({ previousPost: { id: 8 }, nextPost: { id: 6 }, relatedPosts: [], relatedProducts: [], sequence: { scope: 'archive', position: 2, total: 3 } });
    expect(response.body.content).toMatch(/^<p data-paragraph-id="legacy-[a-f0-9]+">Safe<\/p>$/);
    expect(prisma.blogPost.findFirst.mock.calls.at(-1)[0].where).toEqual({ slug: 'test-article', isPublished: true });
  });

  it('returns navigation in oldest-first order within a series', async () => {
    prisma.blogPost.findFirst.mockResolvedValueOnce({
      ...storedPost, isPublished: true, seriesId: 12,
      series: { id: 12, name: 'Visual Rhythm', slug: 'visual-rhythm' },
    });
    prisma.blogPost.findMany
      .mockResolvedValueOnce([{ id: 8, slug: 'latest', title: 'Latest', seriesId: 12 }, { id: 7, slug: 'test-article', title: 'Current', seriesId: 12 }, { id: 6, slug: 'earliest', title: 'Earliest', seriesId: 12 }])
      .mockResolvedValueOnce([{ id: 6, slug: 'earliest', title: 'Earliest', seriesId: 12 }, { id: 7, slug: 'test-article', title: 'Current', seriesId: 12 }, { id: 8, slug: 'latest', title: 'Latest', seriesId: 12 }]);
    const response = await request(app).get('/api/blog/test-article').expect(200);
    expect(response.body).toMatchObject({
      seriesName: 'Visual Rhythm', seriesSlug: 'visual-rhythm',
      previousPost: { id: 6 }, nextPost: { id: 8 },
      sequence: { scope: 'series', seriesName: 'Visual Rhythm', seriesSlug: 'visual-rhythm', position: 2, total: 3 },
    });
    expect(response.body).not.toHaveProperty('seriesId');
    expect(response.body.series).toEqual({ name: 'Visual Rhythm', slug: 'visual-rhythm' });
    expect(prisma.blogPost.findMany.mock.calls[1][0]).toMatchObject({
      where: { isPublished: true, seriesId: 12 },
      orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
    });
  });
});
