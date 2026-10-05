const prisma = require('../lib/prisma');
const { publishDueBlogPosts } = require('../services/publishingScheduler');
const { contentDocument } = require('../utils/annotationContent');
const RESERVED_HANDLES = new Set(['profile', 'login', 'register', 'me', 'settings', 'admin', 'account', 'new']);
const PROFILE_SELECT = { id: true, name: true, email: true, handle: true, pronouns: true, socialLinks: true, bio: true, patreonUrl: true };

function canEditAuthor(user) {
  return user.role === 'ADMIN' || (user.role === 'COLABORADOR' && user.enabledFeatures?.includes('blog'));
}

function cleanLinks(value) {
  if (!Array.isArray(value) || value.length > 8) return null;
  const links = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const label = typeof item.label === 'string' ? item.label.trim() : '';
    if (!label || label.length > 40 || typeof item.url !== 'string' || item.url.length > 500) return null;
    let url;
    try { url = new URL(item.url); }
    catch { return null; }
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    links.push({ label, url: url.toString() });
  }
  return links;
}

async function ownProfile(req, res, next) {
  try {
    res.set('Cache-Control', 'private, no-store');
    const profile = await prisma.user.findUnique({ where: { id: req.user.id }, select: PROFILE_SELECT });
    if (!profile) return res.status(404).json({ error: 'Perfil no disponible.' });
    return res.json({ profile: { ...profile, canEditAuthor: canEditAuthor(req.user), socialLinks: Array.isArray(profile.socialLinks) ? profile.socialLinks : [] } });
  } catch (error) { return next(error); }
}

async function resolvePublicUser(req) {
  const handle = req.params.handle;
  if (handle === '_self') {
    if (!req.user) return null;
    return prisma.user.findFirst({ where: { id: req.user.id, isActive: true },
      select: { id: true, name: true, handle: true, pronouns: true, socialLinks: true } });
  }
  const user = await prisma.user.findFirst({ where: { handle, isActive: true },
    select: { id: true, name: true, handle: true, pronouns: true, socialLinks: true } });
  if (user) return user;
  const previous = await prisma.profileHandleRedirect.findUnique({ where: { handle }, select: { user: {
    select: { id: true, name: true, handle: true, pronouns: true, socialLinks: true, isActive: true },
  } } });
  return previous?.user?.isActive ? previous.user : null;
}

async function publicProfile(req, res, next) {
  try {
    res.set('Cache-Control', req.params.handle === '_self' ? 'private, no-store' : 'public, max-age=60');
    const user = await resolvePublicUser(req);
    if (!user) return res.status(req.params.handle === '_self' && !req.user ? 401 : 404).json({ error: 'Perfil no disponible.' });
    return res.json({ profile: { handle: user.handle, name: user.name, pronouns: user.pronouns,
      socialLinks: Array.isArray(user.socialLinks) ? user.socialLinks : [] },
      redirectTo: req.params.handle !== '_self' && req.params.handle !== user.handle ? user.handle : null });
  } catch (error) { return next(error); }
}

async function eligibleTargets(feature) {
  const posts = await prisma.blogPost.findMany({ where: { isPublished: true, [feature]: true }, select: { id: true } });
  if (!posts.length) return [];
  const targets = await prisma.annotationTarget.findMany({ where: { targetType: 'BLOG_POST', targetId: { in: posts.map((post) => post.id) } }, select: { id: true } });
  return targets.map((target) => target.id);
}

async function updateOwnProfile(req, res, next) {
  try {
    res.set('Cache-Control', 'private, no-store');
    const payload = req.body || {};
    const keys = Object.keys(payload);
    if (!keys.length || keys.some((key) => !['handle', 'pronouns', 'socialLinks', 'bio', 'patreonUrl'].includes(key)))
      return res.status(400).json({ error: 'Campos de perfil no válidos.' });
    if (keys.some((key) => ['bio', 'patreonUrl'].includes(key)) && !canEditAuthor(req.user))
      return res.status(403).json({ error: 'Los datos de autor requieren permiso para publicar en el blog.' });
    const data = {};
    if (Object.hasOwn(payload, 'bio')) {
      if (payload.bio !== null && (typeof payload.bio !== 'string' || payload.bio.trim().length > 1500))
        return res.status(400).json({ error: 'La biografía admite hasta 1.500 caracteres.' });
      data.bio = payload.bio?.trim() || null;
    }
    if (Object.hasOwn(payload, 'patreonUrl')) {
      data.patreonUrl = null;
      if (payload.patreonUrl !== null && payload.patreonUrl !== '') {
        try {
          if (typeof payload.patreonUrl !== 'string' || payload.patreonUrl.length > 500) throw new Error();
          const url = new URL(payload.patreonUrl);
          if (url.protocol !== 'https:' || !['patreon.com', 'www.patreon.com'].includes(url.hostname) || url.username || url.password) throw new Error();
          data.patreonUrl = url.toString();
        } catch { return res.status(400).json({ error: 'Usa un enlace HTTPS de Patreon válido.' }); }
      }
    }
    if (Object.hasOwn(payload, 'handle')) {
      if (typeof payload.handle !== 'string' || !/^[a-z][a-z0-9_-]{2,29}$/.test(payload.handle) || RESERVED_HANDLES.has(payload.handle))
        return res.status(400).json({ error: 'El alias debe tener 3–30 caracteres, empezar por una letra y usar minúsculas, números, guiones o guiones bajos.' });
      data.handle = payload.handle;
    }
    if (Object.hasOwn(payload, 'pronouns')) {
      if (payload.pronouns !== null && (typeof payload.pronouns !== 'string' || payload.pronouns.trim().length > 60))
        return res.status(400).json({ error: 'Pronombres no válidos.' });
      data.pronouns = payload.pronouns?.trim() || null;
    }
    if (Object.hasOwn(payload, 'socialLinks')) {
      const links = cleanLinks(payload.socialLinks);
      if (!links) return res.status(400).json({ error: 'Añade hasta ocho enlaces HTTPS con un nombre breve.' });
      data.socialLinks = links;
    }
    const profile = await prisma.$transaction(async (db) => {
      if (data.handle) {
        // A single namespace spans active and historical aliases.
        await db.$queryRaw`SELECT pg_advisory_xact_lock(817326)`;
        const [current, active, old] = await Promise.all([
          db.user.findUnique({ where: { id: req.user.id }, select: { handle: true } }),
          db.user.findUnique({ where: { handle: data.handle }, select: { id: true } }),
          db.profileHandleRedirect.findUnique({ where: { handle: data.handle }, select: { userId: true } }),
        ]);
        if (!current) return null;
        if ((active && active.id !== req.user.id) || (old && old.userId !== req.user.id)) {
          const error = new Error('Ese alias ya está ocupado.'); error.status = 409; throw error;
        }
        if (current.handle !== data.handle) {
          if (old?.userId === req.user.id) await db.profileHandleRedirect.delete({ where: { handle: data.handle } });
          if (current.handle) await db.profileHandleRedirect.create({ data: { handle: current.handle, userId: req.user.id } });
        }
      }
      return db.user.update({ where: { id: req.user.id }, data, select: PROFILE_SELECT });
    }, { isolationLevel: 'Serializable' });
    if (!profile) return res.status(404).json({ error: 'Perfil no disponible.' });
    return res.json({ profile: { ...profile, canEditAuthor: canEditAuthor(req.user), socialLinks: Array.isArray(profile.socialLinks) ? profile.socialLinks : [] } });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'P2002') return res.status(409).json({ error: 'Ese alias ya está ocupado.' });
    return next(error);
  }
}

function paging(req) {
  const parse = (value, fallback, maximum) => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) return null;
    return Math.min(Number(value), maximum);
  };
  const page = parse(req.query.page, 1, 100000);
  const limit = parse(req.query.limit, 12, 50);
  return page && limit ? { page, limit } : null;
}

async function postMapFor(rows) {
  const ids = [...new Set(rows.filter((row) => row.target?.targetType === 'BLOG_POST').map((row) => row.target.targetId))];
  if (!ids.length) return new Map();
  const posts = await prisma.blogPost.findMany({ where: { id: { in: ids } },
    select: { id: true, slug: true, title: true, content: true, isPublished: true,
      notesEnabled: true, commentsEnabled: true } });
  return new Map(posts.map((post) => [post.id, post]));
}

function postInfo(row, posts) {
  const post = posts.get(row.target?.targetId);
  return { postTitle: post?.title || 'Artículo retirado', postSlug: post?.isPublished ? post.slug : null, post };
}

function paragraphStatus(row, post) {
  if (!row.paragraphId) return 'general';
  if (!post) return 'previous-version';
  if (!post.paragraphIds) {
    const root = contentDocument(post.content, post.id);
    try { post.paragraphIds = new Set([...root.querySelectorAll('p[data-paragraph-id]')].map((node) => node.getAttribute('data-paragraph-id'))); }
    finally { root.ownerDocument.defaultView.close(); }
  }
  return post.paragraphIds.has(row.paragraphId) ? 'current' : 'previous-version';
}

function sendPage(res, key, rows, total, page, limit) {
  res.set('Cache-Control', 'private, no-store');
  return res.json({ [key]: rows, total, page, totalPages: Math.ceil(total / limit) });
}

async function myNotes(req, res, next) {
  try {
    const pageSpec = paging(req);
    if (!pageSpec) return res.status(400).json({ error: 'Paginación no válida.' });
    await publishDueBlogPosts();
    const { page, limit } = pageSpec;
    const where = { userId: req.user.id, target: { targetType: 'BLOG_POST' } };
    const [total, notes] = await Promise.all([
      prisma.readerNote.count({ where }),
      prisma.readerNote.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { target: true, user: { select: { name: true } } } }),
    ]);
    const posts = await postMapFor(notes);
    return sendPage(res, 'notes', notes.map((note) => {
      const { postTitle, postSlug, post } = postInfo(note, posts);
      return { id: note.id, body: note.body, anchor: note.selector?.exact || null,
        selector: note.selector, isPublic: note.isPublic, paragraphId: note.paragraphId,
        paragraphSnapshot: note.paragraphSnapshot, paragraphStatus: paragraphStatus(note, post),
        author: note.user, createdAt: note.createdAt, updatedAt: note.updatedAt, postTitle, postSlug };
    }), total, page, limit);
  } catch (error) { return next(error); }
}

async function myComments(req, res, next) {
  try {
    const pageSpec = paging(req);
    if (!pageSpec) return res.status(400).json({ error: 'Paginación no válida.' });
    await publishDueBlogPosts();
    const { page, limit } = pageSpec;
    const where = { userId: req.user.id, target: { targetType: 'BLOG_POST' } };
    const [total, comments] = await Promise.all([
      prisma.blogComment.count({ where }),
      prisma.blogComment.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: {
          target: true, user: { select: { name: true } },
          parent: { select: { user: { select: { name: true } } } },
          _count: { select: { replies: true, likes: true } },
          likes: { where: { userId: req.user.id }, select: { userId: true } },
        } }),
    ]);
    const posts = await postMapFor(comments);
    return sendPage(res, 'comments', comments.map((comment) => {
      const { postTitle, postSlug, post } = postInfo(comment, posts);
      return { id: comment.id, body: comment.body, highlight: comment.highlight,
        paragraphId: comment.paragraphId, paragraphSnapshot: comment.paragraphSnapshot,
        paragraphStatus: paragraphStatus(comment, post), author: comment.user,
        publishedAt: comment.createdAt, replies: comment._count.replies, likes: comment._count.likes,
        liked: Boolean(comment.likes.length), rootId: comment.rootId, parentId: comment.parentId,
        toName: comment.parent?.user?.name || null, postTitle, postSlug,
        available: Boolean(post?.isPublished && post.commentsEnabled) };
    }), total, page, limit);
  } catch (error) { return next(error); }
}

async function myHighlights(req, res, next) {
  try {
    const pageSpec = paging(req);
    if (!pageSpec) return res.status(400).json({ error: 'Paginación no válida.' });
    await publishDueBlogPosts();
    const { page, limit } = pageSpec;
    const where = { userId: req.user.id, target: { targetType: 'BLOG_POST' } };
    const [total, highlights] = await Promise.all([
      prisma.readerHighlight.count({ where }),
      prisma.readerHighlight.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { target: true } }),
    ]);
    const posts = await postMapFor(highlights);
    return sendPage(res, 'highlights', highlights.map((highlight) => {
      const { postTitle, postSlug } = postInfo(highlight, posts);
      return { id: highlight.id, exact: highlight.selector?.exact || '', createdAt: highlight.createdAt, postTitle, postSlug };
    }), total, page, limit);
  } catch (error) { return next(error); }
}

async function publicNotes(req, res, next) {
  try {
    const pageSpec = paging(req);
    if (!pageSpec) return res.status(400).json({ error: 'Paginación no válida.' });
    await publishDueBlogPosts();
    const user = await resolvePublicUser(req);
    if (!user) return res.status(404).json({ error: 'Perfil no disponible.' });
    const { page, limit } = pageSpec;
    const targetIds = await eligibleTargets('notesEnabled');
    const where = { userId: user.id, isPublic: true, targetId: { in: targetIds } };
    const [total, notes] = await Promise.all([
      prisma.readerNote.count({ where }),
      prisma.readerNote.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { target: true, user: { select: { name: true } } } }),
    ]);
    const posts = await postMapFor(notes);
    return sendPage(res, 'notes', notes.map((note) => {
      const { postTitle, postSlug, post } = postInfo(note, posts);
      return { id: note.id, body: note.body, anchor: note.selector?.exact || null,
        isPublic: true, paragraphId: note.paragraphId, paragraphSnapshot: note.paragraphSnapshot,
        paragraphStatus: paragraphStatus(note, post), author: note.user, createdAt: note.createdAt,
        updatedAt: note.updatedAt, postTitle, postSlug };
    }), total, page, limit);
  } catch (error) { return next(error); }
}

async function publicComments(req, res, next) {
  try {
    const pageSpec = paging(req);
    if (!pageSpec) return res.status(400).json({ error: 'Paginación no válida.' });
    await publishDueBlogPosts();
    const user = await resolvePublicUser(req);
    if (!user) return res.status(404).json({ error: 'Perfil no disponible.' });
    const { page, limit } = pageSpec;
    const targetIds = await eligibleTargets('commentsEnabled');
    const where = { userId: user.id, targetId: { in: targetIds } };
    const [total, comments] = await Promise.all([
      prisma.blogComment.count({ where }),
      prisma.blogComment.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: {
          target: true, user: { select: { name: true } },
          parent: { select: { user: { select: { name: true } } } },
          _count: { select: { replies: true, likes: true } },
          ...(req.user ? { likes: { where: { userId: req.user.id }, select: { userId: true } } } : {}),
        } }),
    ]);
    const posts = await postMapFor(comments);
    return sendPage(res, 'comments', comments.map((comment) => {
      const { postTitle, postSlug, post } = postInfo(comment, posts);
      return { id: comment.id, body: comment.body, highlight: comment.highlight,
        paragraphId: comment.paragraphId, paragraphSnapshot: comment.paragraphSnapshot,
        paragraphStatus: paragraphStatus(comment, post), author: comment.user,
        publishedAt: comment.createdAt, replies: comment._count.replies, likes: comment._count.likes,
        liked: Boolean(comment.likes?.length), rootId: comment.rootId, parentId: comment.parentId,
        toName: comment.parent?.user?.name || null, postTitle, postSlug, available: true };
    }), total, page, limit);
  } catch (error) { return next(error); }
}

function productCard(product) {
  return { id: product.id, title: product.name, price: String(product.launchPrice),
    coverUrl: product.images?.[0]?.url || null, available: product.isActive,
    href: null };
}

async function myWishlist(req, res, next) {
  try {
    const pageSpec = paging(req);
    if (!pageSpec) return res.status(400).json({ error: 'Paginación no válida.' });
    const { page, limit } = pageSpec;
    const where = { userId: req.user.id };
    const [total, items] = await Promise.all([
      prisma.wishlistItem.count({ where }),
      prisma.wishlistItem.findMany({ where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ createdAt: 'desc' }, { productId: 'desc' }],
        select: { product: { select: { id: true, name: true, launchPrice: true, isActive: true,
          images: { orderBy: [{ isMain: 'desc' }, { order: 'asc' }], take: 1, select: { url: true } } } } } }),
    ]);
    return sendPage(res, 'items', items.map(({ product }) => productCard(product)), total, page, limit);
  } catch (error) { return next(error); }
}

async function searchWishlistProducts(req, res, next) {
  try {
    res.set('Cache-Control', 'private, no-store');
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (query.length < 2 || query.length > 80) return res.status(400).json({ error: 'Busca entre 2 y 80 caracteres.' });
    const products = await prisma.product.findMany({ where: { isActive: true, name: { contains: query, mode: 'insensitive' } },
      take: 20, orderBy: { name: 'asc' }, select: { id: true, name: true, launchPrice: true, isActive: true,
        images: { orderBy: [{ isMain: 'desc' }, { order: 'asc' }], take: 1, select: { url: true } } } });
    const saved = products.length ? await prisma.wishlistItem.findMany({ where: { userId: req.user.id,
      productId: { in: products.map((product) => product.id) } }, select: { productId: true } }) : [];
    const savedIds = new Set(saved.map((item) => item.productId));
    return res.json({ products: products.map((product) => ({ ...productCard(product), saved: savedIds.has(product.id) })) });
  } catch (error) { return next(error); }
}

async function addWishlistItem(req, res, next) {
  try {
    res.set('Cache-Control', 'private, no-store');
    const productId = Number(req.params.productId);
    if (!Number.isSafeInteger(productId) || productId < 1) return res.status(400).json({ error: 'Producto no válido.' });
    const product = await prisma.product.findFirst({ where: { id: productId, isActive: true }, select: { id: true } });
    if (!product) return res.status(404).json({ error: 'Producto no disponible.' });
    await prisma.wishlistItem.upsert({ where: { userId_productId: { userId: req.user.id, productId } },
      update: {}, create: { userId: req.user.id, productId } });
    return res.json({ saved: true });
  } catch (error) { return next(error); }
}

async function removeWishlistItem(req, res, next) {
  try {
    res.set('Cache-Control', 'private, no-store');
    const productId = Number(req.params.productId);
    if (!Number.isSafeInteger(productId) || productId < 1) return res.status(400).json({ error: 'Producto no válido.' });
    await prisma.wishlistItem.deleteMany({ where: { userId: req.user.id, productId } });
    return res.json({ saved: false });
  } catch (error) { return next(error); }
}

module.exports = { ownProfile, updateOwnProfile, publicProfile, publicNotes, publicComments,
  myNotes, myComments, myHighlights,
  myWishlist, searchWishlistProducts, addWishlistItem, removeWishlistItem };
