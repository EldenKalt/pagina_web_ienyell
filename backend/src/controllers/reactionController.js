const prisma = require('../lib/prisma');
const { publishDueBlogPosts } = require('../services/publishingScheduler');

const idFrom = (value) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

async function publishedPost(slug) {
  await publishDueBlogPosts();
  return prisma.blogPost.findFirst({ where: { slug, isPublished: true }, select: { id: true, shareCount: true } });
}

async function postReactions(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const post = await publishedPost(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Artículo no disponible.' });
    const [likes, liked] = await Promise.all([
      prisma.blogPostLike.count({ where: { postId: post.id } }),
      req.user ? prisma.blogPostLike.findUnique({ where: { userId_postId: { userId: req.user.id, postId: post.id } }, select: { postId: true } }) : null,
    ]);
    return res.json({ likes, liked: Boolean(liked), shares: post.shareCount || 0 });
  } catch (error) { return next(error); }
}

async function recordShare(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    await publishDueBlogPosts();
    const post = await prisma.blogPost.findFirst({ where: { slug: req.params.slug, isPublished: true }, select: { id: true } });
    if (!post) return res.status(404).json({ error: 'Artículo no disponible.' });
    const changed = await prisma.blogPost.updateMany({ where: { id: post.id, isPublished: true }, data: { shareCount: { increment: 1 } } });
    if (!changed.count) return res.status(404).json({ error: 'Artículo no disponible.' });
    const result = await prisma.blogPost.findUnique({ where: { id: post.id }, select: { shareCount: true } });
    return res.json({ shares: result.shareCount });
  } catch (error) { return next(error); }
}

async function setPostLike(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const post = await publishedPost(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Artículo no disponible.' });
    const key = { userId: req.user.id, postId: post.id };
    if (req.method === 'PUT') await prisma.blogPostLike.upsert({ where: { userId_postId: key }, update: {}, create: key });
    else await prisma.blogPostLike.deleteMany({ where: key });
    const likes = await prisma.blogPostLike.count({ where: { postId: post.id } });
    return res.json({ likes, liked: req.method === 'PUT' });
  } catch (error) { return next(error); }
}

async function setCommentLike(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const commentId = idFrom(req.params.id);
    if (!commentId) return res.status(400).json({ error: 'Comentario no válido.' });
    await publishDueBlogPosts();
    const comment = await prisma.blogComment.findUnique({ where: { id: commentId }, include: { target: true } });
    if (!comment || comment.target.targetType !== 'BLOG_POST') return res.status(404).json({ error: 'Comentario no disponible.' });
    const post = await prisma.blogPost.findFirst({ where: { id: comment.target.targetId, isPublished: true, commentsEnabled: true }, select: { id: true } });
    if (!post) return res.status(404).json({ error: 'Comentario no disponible.' });
    const key = { userId: req.user.id, commentId };
    if (req.method === 'PUT') await prisma.blogCommentLike.upsert({ where: { userId_commentId: key }, update: {}, create: key });
    else await prisma.blogCommentLike.deleteMany({ where: key });
    const likes = await prisma.blogCommentLike.count({ where: { commentId } });
    return res.json({ likes, liked: req.method === 'PUT' });
  } catch (error) { return next(error); }
}

module.exports = { postReactions, setPostLike, setCommentLike, recordShare };
