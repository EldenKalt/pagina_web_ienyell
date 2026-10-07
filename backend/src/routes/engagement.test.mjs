import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const require = createRequire(import.meta.url);
const paths = [
  './blog.js', './comments.js', '../controllers/savedBlogController.js', '../controllers/reactionController.js',
  '../controllers/blogController.js', '../controllers/commentController.js', '../middleware/auth.js',
  '../services/publishingScheduler.js', '../lib/prisma.js',
].map((path) => require.resolve(path));
const savedModules = new Map(paths.map((path) => [path, require.cache[path]]));
const originalSecret = process.env.JWT_SECRET;
let prisma;
let app;
let post;
let saves;
let postLikes;
let commentLikes;

const token = () => jwt.sign({ id: 5 }, process.env.JWT_SECRET, {
  algorithm: 'HS256', issuer: 'ienyell-api', audience: 'ienyell-app', expiresIn: '1h',
});
const auth = () => ({ Authorization: `Bearer ${token()}` });

beforeEach(() => {
  process.env.JWT_SECRET = 'engagement-test-secret';
  post = { id: 7, slug: 'story', isPublished: true, commentsEnabled: true, shareCount: 0 };
  saves = new Set(); postLikes = new Set(); commentLikes = new Set();
  prisma = {
    user: { findUnique: vi.fn(async () => ({ id: 5, name: 'Reader', role: 'CLIENT', isActive: true, enabledFeatures: [] })) },
    blogPost: {
      findFirst: vi.fn(async ({ where }) => (where.slug === post.slug || where.id === post.id)
        && (!where.isPublished || post.isPublished) && (!where.commentsEnabled || post.commentsEnabled) ? post : null),
      findUnique: vi.fn(async ({ where }) => where.slug === post.slug || where.id === post.id ? post : null),
      updateMany: vi.fn(async ({ where, data }) => {
        if (where.id !== post.id || (where.isPublished && !post.isPublished)) return { count: 0 };
        post.shareCount += data.shareCount.increment;
        return { count: 1 };
      }),
    },
    savedBlogPost: {
      findUnique: vi.fn(async () => saves.has(5) ? { postId: post.id } : null),
      upsert: vi.fn(async () => { saves.add(5); return {}; }),
      deleteMany: vi.fn(async () => { saves.delete(5); return { count: 1 }; }),
      count: vi.fn(async () => saves.size),
      findMany: vi.fn(async () => saves.size ? [{ post: { id: post.id, title: 'Story', slug: post.slug } }] : []),
    },
    blogPostLike: {
      findUnique: vi.fn(async () => postLikes.has(5) ? { postId: post.id } : null),
      count: vi.fn(async () => postLikes.size),
      upsert: vi.fn(async () => { postLikes.add(5); return {}; }),
      deleteMany: vi.fn(async () => { postLikes.delete(5); return { count: 1 }; }),
    },
    blogComment: { findUnique: vi.fn(async ({ where }) => where.id === 9 ? { id: 9, target: { targetType: 'BLOG_POST', targetId: 7 } } : null) },
    blogCommentLike: {
      count: vi.fn(async () => commentLikes.size),
      upsert: vi.fn(async () => { commentLikes.add(5); return {}; }),
      deleteMany: vi.fn(async () => { commentLikes.delete(5); return { count: 1 }; }),
    },
  };
  for (const path of paths) delete require.cache[path];
  const prismaPath = paths.at(-1);
  const schedulerPath = paths.at(-2);
  require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: prisma };
  require.cache[schedulerPath] = { id: schedulerPath, filename: schedulerPath, loaded: true,
    exports: { publishDueBlogPosts: vi.fn(async () => {}) } };
  app = express(); app.use(express.json());
  app.use('/api/blog', require('./blog.js'));
  app.use('/api/comments', require('./comments.js'));
  app.use((_error, _req, res, _next) => res.status(500).json({ error: 'Synthetic server error' }));
});
afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
  for (const path of paths) {
    if (savedModules.get(path)) require.cache[path] = savedModules.get(path);
    else delete require.cache[path];
  }
});

describe('saved articles and reactions', () => {
  it('requires a session, keeps one bookmark, lists it privately, and removes it idempotently', async () => {
    await request(app).put('/api/blog/story/save').expect(401);
    await request(app).get('/api/blog/saved').expect(401);
    await request(app).put('/api/blog/story/save').set(auth()).expect(200);
    await request(app).put('/api/blog/story/save').set(auth()).expect(200);
    expect((await request(app).get('/api/blog/story/save').set(auth()).expect(200)).body.saved).toBe(true);
    expect((await request(app).get('/api/blog/saved').set(auth()).expect(200)).body).toMatchObject({ total: 1, posts: [{ slug: 'story' }] });
    await request(app).delete('/api/blog/story/save').set(auth()).expect(200);
    await request(app).delete('/api/blog/story/save').set(auth()).expect(200);
    expect(saves.size).toBe(0);
  });

  it('counts one post like per account and lets the account remove it', async () => {
    await request(app).put('/api/blog/story/like').expect(401);
    await request(app).put('/api/blog/story/like').set(auth()).expect(200);
    await request(app).put('/api/blog/story/like').set(auth()).expect(200);
    expect((await request(app).get('/api/blog/story/reactions').set(auth()).expect(200)).body).toMatchObject({ likes: 1, liked: true });
    await request(app).delete('/api/blog/story/like').set(auth()).expect(200);
    expect((await request(app).get('/api/blog/story/reactions').expect(200)).body).toMatchObject({ likes: 0, liked: false });
  });

  it('counts a confirmed share and rejects interactions with an unpublished article', async () => {
    expect((await request(app).post('/api/blog/story/share').expect(200)).body.shares).toBe(1);
    post.isPublished = false;
    await request(app).post('/api/blog/story/share').expect(404);
    await request(app).put('/api/blog/story/save').set(auth()).expect(404);
    await request(app).put('/api/blog/story/like').set(auth()).expect(404);
  });

  it('likes a published comment only with a session', async () => {
    await request(app).put('/api/comments/9/like').expect(401);
    expect((await request(app).put('/api/comments/9/like').set(auth()).expect(200)).body).toMatchObject({ likes: 1, liked: true });
    expect((await request(app).delete('/api/comments/9/like').set(auth()).expect(200)).body).toMatchObject({ likes: 0, liked: false });
    post.commentsEnabled = false;
    await request(app).put('/api/comments/9/like').set(auth()).expect(404);
  });
});
