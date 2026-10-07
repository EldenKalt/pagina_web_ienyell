const prisma = require('../lib/prisma');
const { publishDueBlogPosts } = require('../services/publishingScheduler');
const { contentDocument, locate, validateSelector } = require('../utils/annotationContent');

const fail = (status, message, code) => Object.assign(new Error(message), { status, code });
const wrap = (handler) => async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  try { await handler(req, res); }
  catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, ...(error.code ? { code: error.code } : {}) });
    return next(error);
  }
};
const targetWhere = (postId) => ({ targetType_targetId: { targetType: 'BLOG_POST', targetId: postId } });
const authorInclude = { user: { select: { name: true } } };
const reactionInclude = (user, replies = false) => ({
  ...authorInclude,
  _count: { select: { likes: true, ...(replies ? { replies: true } : {}) } },
  ...(user ? { likes: { where: { userId: user.id }, select: { userId: true } } } : {}),
});

function positive(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw fail(400, 'Paginación no válida.');
  return Math.min(Number(value), maximum);
}
function bodyFrom(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2500) throw fail(400, 'El comentario debe contener entre 1 y 2.500 caracteres.');
  return value;
}
function idFrom(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw fail(400, 'ID de comentario inválido.');
  return id;
}
async function postFor(db, slug) {
  const post = await db.blogPost.findFirst({ where: { slug, isPublished: true, commentsEnabled: true }, select: { id: true, content: true } });
  if (!post) throw fail(404, 'Este artículo no admite comentarios.');
  return post;
}
async function targetFor(db, postId) {
  return db.annotationTarget.upsert({ where: targetWhere(postId), update: {}, create: { targetType: 'BLOG_POST', targetId: postId } });
}
function paragraphs(root) {
  return [...root.querySelectorAll('p[data-paragraph-id]')].map((node) => ({
    id: node.getAttribute('data-paragraph-id'), text: node.textContent || '',
  }));
}
function placement(comment, active) {
  if (comment.isUnassigned) return 'unassigned';
  if (!comment.paragraphId) return 'general';
  return active.has(comment.paragraphId) ? 'current' : 'previous-version';
}
function present(comment, active, replyCount = 0) {
  return {
    id: comment.id, body: comment.body, highlight: comment.highlight || null,
    selector: comment.selector || null, paragraphId: comment.paragraphId || null,
    paragraphSnapshot: comment.paragraphSnapshot || null,
    paragraphStatus: placement(comment, active),
    author: comment.user, publishedAt: comment.createdAt,
    replies: replyCount, likes: comment._count?.likes || 0, liked: Boolean(comment.likes?.length),
    ...(comment.rootId ? { parentId: comment.parentId, rootId: comment.rootId, toName: comment.parent?.user?.name || null } : {}),
  };
}
async function withPublished(req, handler) {
  await publishDueBlogPosts();
  const post = await postFor(prisma, req.params.slug);
  const root = contentDocument(post.content, post.id);
  try { return await handler(post, root); }
  finally { root.ownerDocument.defaultView.close(); }
}
async function withWrite(req, handler) {
  await publishDueBlogPosts();
  return prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM "BlogPost" WHERE slug = ${req.params.slug} FOR SHARE`;
    const post = await postFor(db, req.params.slug);
    const root = contentDocument(post.content, post.id);
    try { return await handler(db, post, root); }
    finally { root.ownerDocument.defaultView.close(); }
  }, { isolationLevel: 'Serializable' });
}

const listComments = wrap(async (req, res) => {
  const page = positive(req.query.page, 1, 100000);
  const limit = positive(req.query.limit, 3, 100);
  const result = await withPublished(req, async (post, root) => {
    const target = await prisma.annotationTarget.findUnique({ where: targetWhere(post.id) });
    if (!target) return { comments: [], total: 0, page, totalPages: 0, filteredTotal: 0 };
    const active = new Set(paragraphs(root).map((paragraph) => paragraph.id));
    const where = { targetId: target.id, rootId: null };
    if (req.query.paragraph !== undefined) {
      if (typeof req.query.paragraph !== 'string' || !active.has(req.query.paragraph)) throw fail(400, 'Párrafo no válido.');
      where.paragraphId = req.query.paragraph;
      where.isUnassigned = false;
    } else if (req.query.placement === 'previous') {
      where.OR = [{ isUnassigned: true }, { paragraphId: { not: null, notIn: [...active] } }];
    } else if (req.query.placement === 'current') {
      where.isUnassigned = false;
      where.OR = [{ paragraphId: null }, { paragraphId: { in: [...active] } }];
    } else if (req.query.placement && req.query.placement !== 'all') throw fail(400, 'Filtro no válido.');
    const [total, filteredTotal, comments] = await Promise.all([
      prisma.blogComment.count({ where: { targetId: target.id } }),
      prisma.blogComment.count({ where }),
      prisma.blogComment.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: reactionInclude(req.user, true) }),
    ]);
    return { comments: comments.map((comment) => present(comment, active, comment._count.replies)), total, page,
      totalPages: Math.ceil(filteredTotal / limit), filteredTotal };
  });
  res.json(result);
});

const commentLocations = wrap(async (req, res) => {
  const result = await withPublished(req, async (post, root) => {
    const target = await prisma.annotationTarget.findUnique({ where: targetWhere(post.id) });
    const active = new Set(paragraphs(root).map((paragraph) => paragraph.id));
    if (!target) return { paragraphs: [], previousCount: 0, generalCount: 0, total: 0 };
    const roots = await prisma.blogComment.findMany({ where: { targetId: target.id, rootId: null },
      select: { paragraphId: true, isUnassigned: true, _count: { select: { replies: true } } } });
    const counts = new Map();
    let previousCount = 0;
    let generalCount = 0;
    for (const comment of roots) {
      const value = 1 + comment._count.replies;
      if (comment.isUnassigned || (comment.paragraphId && !active.has(comment.paragraphId))) previousCount += value;
      else if (!comment.paragraphId) generalCount += value;
      else counts.set(comment.paragraphId, (counts.get(comment.paragraphId) || 0) + value);
    }
    return { paragraphs: [...counts].map(([paragraphId, count]) => ({ paragraphId, count })),
      previousCount, generalCount, total: previousCount + generalCount + [...counts.values()].reduce((a, b) => a + b, 0) };
  });
  res.json(result);
});

const createComment = wrap(async (req, res) => {
  const body = bodyFrom(req.body?.body);
  const anchor = req.body?.anchor ?? null;
  const requestedParagraph = req.body?.paragraphId ?? null;
  if (anchor !== null && !validateSelector(anchor)) throw fail(400, 'La cita seleccionada no es válida.');
  if (requestedParagraph !== null && (typeof requestedParagraph !== 'string' || requestedParagraph.length > 80)) throw fail(400, 'Párrafo no válido.');
  const comment = await withWrite(req, async (db, post, root) => {
    const available = paragraphs(root);
    let paragraph = null;
    let selector;
    let highlight = null;
    if (anchor) {
      const found = locate(root, anchor);
      if (!found) throw fail(409, 'El artículo cambió. Vuelve a seleccionar el fragmento.', 'CONTENT_CHANGED');
      selector = found.selector;
      highlight = found.selector.exact;
      paragraph = available.find((item) => item.id === found.paragraphId);
      if (requestedParagraph && requestedParagraph !== paragraph?.id) throw fail(400, 'La cita no pertenece a ese párrafo.');
    } else if (requestedParagraph) paragraph = available.find((item) => item.id === requestedParagraph);
    if (requestedParagraph && !paragraph) throw fail(400, 'Párrafo no válido.');
    const target = await targetFor(db, post.id);
    const created = await db.blogComment.create({ data: {
      targetId: target.id, userId: req.user.id, body, selector, highlight,
      paragraphId: paragraph?.id || null, paragraphSnapshot: paragraph?.text || null,
    }, include: authorInclude });
    return present(created, new Set(available.map((item) => item.id)));
  });
  res.status(201).json({ comment });
});

async function readableThread(db, id) {
  const comment = await db.blogComment.findUnique({ where: { id }, include: { target: true } });
  if (!comment || comment.rootId) throw fail(404, 'Conversación no disponible.');
  const post = await db.blogPost.findFirst({ where: { id: comment.target.targetId, isPublished: true, commentsEnabled: true }, select: { id: true } });
  if (!post || comment.target.targetType !== 'BLOG_POST') throw fail(404, 'Conversación no disponible.');
  return comment;
}

const listReplies = wrap(async (req, res) => {
  const id = idFrom(req.params.id);
  await publishDueBlogPosts();
  await readableThread(prisma, id);
  const replies = await prisma.blogComment.findMany({ where: { rootId: id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: { ...reactionInclude(req.user), parent: { select: { user: { select: { name: true } } } } } });
  res.json({ replies: replies.map((reply) => present(reply, new Set())) });
});

const createReply = wrap(async (req, res) => {
  const parentId = idFrom(req.params.id);
  const body = bodyFrom(req.body?.body);
  await publishDueBlogPosts();
  const reply = await prisma.$transaction(async (db) => {
    const parent = await db.blogComment.findUnique({ where: { id: parentId }, include: { target: true, user: { select: { name: true } } } });
    if (!parent || parent.target.targetType !== 'BLOG_POST') throw fail(404, 'Conversación no disponible.');
    await db.$queryRaw`SELECT id FROM "BlogPost" WHERE id = ${parent.target.targetId} FOR SHARE`;
    const post = await db.blogPost.findFirst({ where: { id: parent.target.targetId, isPublished: true, commentsEnabled: true }, select: { id: true } });
    if (!post) throw fail(404, 'Conversación no disponible.');
    const rootId = parent.rootId || parent.id;
    const created = await db.blogComment.create({ data: { targetId: parent.targetId, userId: req.user.id, rootId, parentId, body },
      include: { ...authorInclude, parent: { select: { user: { select: { name: true } } } } } });
    return present(created, new Set());
  }, { isolationLevel: 'Serializable' });
  res.status(201).json({ reply });
});

const adminThreads = wrap(async (req, res) => {
  const postId = idFrom(req.params.id);
  const page = positive(req.query.page, 1, 100000);
  const limit = positive(req.query.limit, 50, 100);
  const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { id: true, content: true } });
  if (!post) throw fail(404, 'Artículo no encontrado.');
  const root = contentDocument(post.content, post.id);
  try {
    const available = paragraphs(root);
    const target = await prisma.annotationTarget.findUnique({ where: targetWhere(post.id) });
    const where = { targetId: target?.id, rootId: null };
    const [total, comments] = target ? await Promise.all([
      prisma.blogComment.count({ where }),
      prisma.blogComment.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { ...authorInclude, _count: { select: { replies: true } } } }),
    ]) : [0, []];
    res.json({ paragraphs: available, threads: comments.map((comment) => present(comment, new Set(available.map((item) => item.id)), comment._count.replies)),
      total, page, totalPages: Math.ceil(total / limit) });
  } finally { root.ownerDocument.defaultView.close(); }
});

const reassignThreads = wrap(async (req, res) => {
  const postId = idFrom(req.params.id);
  const ids = req.body?.threadIds;
  const destination = req.body?.paragraphId ?? null;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length) throw fail(400, 'Selecciona entre 1 y 100 conversaciones sin duplicados.');
  if (destination !== null && (typeof destination !== 'string' || destination.length > 80)) throw fail(400, 'Párrafo no válido.');
  const changed = await prisma.$transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM "BlogPost" WHERE id = ${postId} FOR SHARE`;
    const post = await db.blogPost.findUnique({ where: { id: postId }, select: { id: true, content: true } });
    if (!post) throw fail(404, 'Artículo no encontrado.');
    const root = contentDocument(post.content, post.id);
    let valid;
    try { valid = destination === null || paragraphs(root).some((item) => item.id === destination); }
    finally { root.ownerDocument.defaultView.close(); }
    if (!valid) throw fail(400, 'El párrafo de destino ya no existe.');
    const target = await db.annotationTarget.findUnique({ where: targetWhere(post.id) });
    if (!target) throw fail(404, 'Conversaciones no encontradas.');
    const threads = await db.blogComment.findMany({ where: { id: { in: ids }, targetId: target.id, rootId: null } });
    if (threads.length !== ids.length) throw fail(404, 'Alguna conversación no pertenece a este artículo.');
    let count = 0;
    for (const thread of threads) {
      const nextUnassigned = destination === null;
      if (thread.paragraphId === destination && thread.isUnassigned === nextUnassigned) continue;
      await db.blogComment.update({ where: { id: thread.id }, data: { paragraphId: destination, isUnassigned: nextUnassigned } });
      await db.commentThreadAssignmentLog.create({ data: {
        threadId: thread.id, actorId: req.user.id, fromParagraphId: thread.paragraphId,
        toParagraphId: destination, fromUnassigned: thread.isUnassigned, toUnassigned: nextUnassigned,
      } });
      count++;
    }
    return count;
  }, { isolationLevel: 'Serializable' });
  res.json({ reassigned: changed });
});

module.exports = { listComments, commentLocations, createComment, listReplies, createReply, adminThreads, reassignThreads };
