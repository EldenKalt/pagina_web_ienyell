const { postMetadata } = require('./blogMetadata');

async function withBlogStats(db, posts) {
  if (!posts.length) return [];
  const ids = [...new Set(posts.map((post) => post.id))];
  const [likes, targets] = await Promise.all([
    db.blogPostLike.groupBy({ by: ['postId'], where: { postId: { in: ids } }, _count: { _all: true } }),
    db.annotationTarget.findMany({ where: { targetType: 'BLOG_POST', targetId: { in: ids } }, select: { id: true, targetId: true } }),
  ]);
  const commentCounts = targets.length ? await db.blogComment.groupBy({ by: ['targetId'],
    where: { targetId: { in: targets.map((target) => target.id) } }, _count: { _all: true } }) : [];
  const likesByPost = new Map(likes.map((row) => [row.postId, row._count._all]));
  const postByTarget = new Map(targets.map((target) => [target.id, target.targetId]));
  const commentsByPost = new Map(commentCounts.map((row) => [postByTarget.get(row.targetId), row._count._all]));
  return posts.map(({ shareCount, commentsEnabled, ...post }) => ({
    ...postMetadata(post),
    ...(commentsEnabled !== undefined ? { commentsEnabled } : {}),
    stats: { likes: likesByPost.get(post.id) || 0,
      comments: commentsEnabled === false ? 0 : commentsByPost.get(post.id) || 0,
      shares: shareCount || 0 },
  }));
}

module.exports = { withBlogStats };
