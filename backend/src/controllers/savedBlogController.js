const prisma = require('../lib/prisma');
const { publishDueBlogPosts } = require('../services/publishingScheduler');
const { postMetadata } = require('../utils/blogMetadata');

function pageValue(value, fallback, max) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return null;
  return Math.min(Number(value), max);
}

async function publicPost(slug) {
  await publishDueBlogPosts();
  return prisma.blogPost.findFirst({ where: { slug, isPublished: true }, select: { id: true } });
}

async function listSaved(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const page = pageValue(req.query.page, 1, 100000);
    const limit = pageValue(req.query.limit, 12, 50);
    if (!page || !limit) return res.status(400).json({ error: 'Paginación no válida.' });
    await publishDueBlogPosts();
    const where = { userId: req.user.id, post: { isPublished: true } };
    const [total, rows] = await Promise.all([
      prisma.savedBlogPost.count({ where }),
      prisma.savedBlogPost.findMany({ where, orderBy: [{ createdAt: 'desc' }, { postId: 'desc' }],
        skip: (page - 1) * limit, take: limit,
        select: { post: { select: { id: true, slug: true, title: true, content: true, excerpt: true, coverUrl: true,
          publishedAt: true, keywords: true, author: { select: { name: true } }, series: { select: { name: true, slug: true } } } } } }),
    ]);
    return res.json({ posts: rows.map(({ post }) => postMetadata(post)), total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) { return next(error); }
}

async function savePost(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const post = await publicPost(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Artículo no disponible.' });
    await prisma.savedBlogPost.upsert({ where: { userId_postId: { userId: req.user.id, postId: post.id } },
      update: {}, create: { userId: req.user.id, postId: post.id } });
    return res.json({ saved: true });
  } catch (error) { return next(error); }
}

async function getSaveState(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const post = await publicPost(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Artículo no disponible.' });
    const row = await prisma.savedBlogPost.findUnique({ where: { userId_postId: { userId: req.user.id, postId: post.id } }, select: { postId: true } });
    return res.json({ saved: Boolean(row) });
  } catch (error) { return next(error); }
}

async function unsavePost(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    // Idempotent: an absent bookmark and a removed article both end unsaved.
    const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
    if (post) await prisma.savedBlogPost.deleteMany({ where: { userId: req.user.id, postId: post.id } });
    return res.json({ saved: false });
  } catch (error) { return next(error); }
}

module.exports = { listSaved, getSaveState, savePost, unsavePost };
