const prisma = require('../lib/prisma');
const { publishDueBlogPosts } = require('../services/publishingScheduler');
const { hash, contentDocument, validateSelector, locate } = require('../utils/annotationContent');

const TARGET_TYPE = 'BLOG_POST';
const fail = (status, message, code) => Object.assign(new Error(message), { status, code });
const noCache = (res) => res.set('Cache-Control', 'private, no-store');
const wrap = (handler) => async (req, res, next) => {
  noCache(res);
  try { await handler(req, res); }
  catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message, ...(error.code ? { code: error.code } : {}) });
    return next(error);
  }
};
const noteInclude = { user: { select: { name: true } } };

async function postFor(db, slug, notes = false) {
  const post = await db.blogPost.findFirst({ where: { slug, isPublished: true },
    select: { id: true, content: true, notesEnabled: true } });
  if (!post || (notes && post.notesEnabled === false)) throw fail(404, 'Este contenido no está disponible.');
  return post;
}

function targetWhere(postId) { return { targetType_targetId: { targetType: TARGET_TYPE, targetId: postId } }; }
async function targetFor(db, postId) {
  return db.annotationTarget.upsert({ where: targetWhere(postId), update: {}, create: { targetType: TARGET_TYPE, targetId: postId } });
}

function presentNote(note, root) {
  const paragraphExists = !note.paragraphId || [...root.querySelectorAll('p[data-paragraph-id]')]
    .some((p) => p.getAttribute('data-paragraph-id') === note.paragraphId);
  return {
    id: note.id, body: note.body, isPublic: note.isPublic, selector: note.selector,
    anchor: note.selector?.exact || null, paragraphId: note.paragraphId,
    paragraphStatus: !note.paragraphId ? 'general' : paragraphExists ? 'current' : 'previous-version',
    paragraphSnapshot: note.paragraphSnapshot, sourceRevision: note.sourceRevision,
    createdAt: note.createdAt, updatedAt: note.updatedAt, author: note.user,
  };
}
const presentHighlight = (highlight) => ({ id: highlight.id, selector: highlight.selector });

async function transaction(work) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: 'Serializable' }); }
    catch (error) {
      if (!['P2034', 'P2002'].includes(error.code) || attempt === 2) throw error;
    }
  }
}

// Hold a share lock until the write is committed so editing/unpublishing the
// article cannot race selector validation. All identifiers are SQL parameters.
async function withPost(req, notes, work) {
  await publishDueBlogPosts();
  return transaction(async (db) => {
    await db.$queryRaw`SELECT id FROM "BlogPost" WHERE slug = ${req.params.slug} FOR SHARE`;
    const post = await postFor(db, req.params.slug, notes);
    const root = contentDocument(post.content, post.id);
    try { return await work(db, post, root); }
    finally { root.ownerDocument.defaultView.close(); }
  });
}

function anchorData(root, anchor) {
  if (anchor == null) return { selector: undefined, paragraphId: null, paragraphSnapshot: null, sourceRevision: null };
  if (!validateSelector(anchor)) throw fail(400, 'El fragmento seleccionado no es válido.');
  const result = locate(root, anchor);
  if (!result) throw fail(409, 'El artículo cambió. Vuelve a seleccionar el fragmento; tu nota no se ha borrado.', 'CONTENT_CHANGED');
  return result;
}

function validateBody(body) {
  if (typeof body !== 'string' || !body.trim() || body.length > 2500) throw fail(400, 'La nota debe contener entre 1 y 2.500 caracteres.');
  return body;
}
function validatePublic(value) {
  if (value !== undefined && typeof value !== 'boolean') throw fail(400, 'La visibilidad no es válida.');
  return value === true;
}

const listNotes = wrap(async (req, res) => {
  await publishDueBlogPosts();
  const post = await postFor(prisma, req.params.slug, true);
  const target = await prisma.annotationTarget.findUnique({ where: targetWhere(post.id) });
  const notes = target ? await prisma.readerNote.findMany({ where: { targetId: target.id, userId: req.user.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: noteInclude }) : [];
  const root = contentDocument(post.content, post.id);
  try { res.json({ notes: notes.map((note) => presentNote(note, root)) }); }
  finally { root.ownerDocument.defaultView.close(); }
});

const listPublicNotes = wrap(async (req, res) => {
  const positive = (value, fallback, maximum) => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw fail(400, 'Paginación no válida.');
    return Math.min(Number(value), maximum);
  };
  const page = positive(req.query.page, 1, 100000);
  const limit = positive(req.query.limit, 6, 24);
  const data = await withPost(req, true, async (db, post, root) => {
    const target = await db.annotationTarget.findUnique({ where: targetWhere(post.id) });
    if (!target) return { notes: [], total: 0, page, totalPages: 0 };
    const where = { targetId: target.id, isPublic: true, user: { isActive: true } };
    const total = await db.readerNote.count({ where });
    const notes = await db.readerNote.findMany({ where, skip: (page - 1) * limit, take: limit,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: noteInclude });
    return { notes: notes.map((note) => presentNote(note, root)), total, page, totalPages: Math.ceil(total / limit) };
  });
  res.json(data);
});

const createNote = wrap(async (req, res) => {
  const body = validateBody(req.body?.body);
  const isPublic = validatePublic(req.body?.isPublic);
  const requestKey = req.get('Idempotency-Key');
  if (!requestKey || !/^[a-zA-Z0-9_-]{8,128}$/.test(requestKey)) throw fail(400, 'Falta el identificador del envío.');
  const anchor = req.body.anchor ?? null;
  if (anchor !== null && !validateSelector(anchor)) throw fail(400, 'El fragmento seleccionado no es válido.');
  const requestHash = hash(JSON.stringify({ slug: req.params.slug, body, isPublic, anchor }));
  const data = await withPost(req, true, async (db, post, root) => {
    const previous = await db.readerNote.findUnique({ where: { userId_requestKey: { userId: req.user.id, requestKey } }, include: noteInclude });
    if (previous) {
      if (previous.requestHash !== requestHash) throw fail(409, 'Ese identificador de envío ya se usó con otra nota.');
      return { note: presentNote(previous, root), created: false };
    }
    const anchored = anchorData(root, anchor);
    const target = await targetFor(db, post.id);
    const note = await db.readerNote.create({ data: {
      body, isPublic, ...anchored, userId: req.user.id, targetId: target.id, requestKey, requestHash,
    }, include: noteInclude });
    return { note: presentNote(note, root), created: true };
  });
  res.status(data.created ? 201 : 200).json({ note: data.note });
});

const updateNote = wrap(async (req, res) => {
  const payload = req.body || {};
  if (!Object.keys(payload).length || Object.keys(payload).some((key) => !['body', 'isPublic'].includes(key))) throw fail(400, 'Solo puedes cambiar el texto y la visibilidad.');
  const data = {};
  if (Object.hasOwn(payload, 'body')) data.body = validateBody(payload.body);
  if (Object.hasOwn(payload, 'isPublic')) data.isPublic = validatePublic(payload.isPublic);
  const result = await transaction(async (db) => {
    const note = await db.readerNote.findFirst({ where: { id: req.params.id, userId: req.user.id }, include: { target: true } });
    if (!note) throw fail(404, 'Nota no encontrada.');
    if (data.isPublic === true) {
      const post = await db.blogPost.findFirst({ where: { id: note.target.targetId, isPublished: true, notesEnabled: true } });
      if (!post) throw fail(404, 'Este contenido no está disponible para publicar notas.');
    }
    const updated = await db.readerNote.update({ where: { id: note.id, userId: req.user.id }, data, include: noteInclude });
    const post = await db.blogPost.findUnique({ where: { id: note.target.targetId }, select: { id: true, content: true } });
    const root = contentDocument(post?.content || '', post?.id);
    try { return presentNote(updated, root); }
    finally { root.ownerDocument.defaultView.close(); }
  });
  res.json({ note: result });
});

const deleteNote = wrap(async (req, res) => {
  // Same result for missing and foreign IDs; it never reveals note ownership.
  await prisma.readerNote.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  res.json({ deleted: true });
});

const listHighlights = wrap(async (req, res) => {
  await publishDueBlogPosts();
  const post = await postFor(prisma, req.params.slug);
  const target = await prisma.annotationTarget.findUnique({ where: targetWhere(post.id) });
  const highlights = target ? await prisma.readerHighlight.findMany({ where: { targetId: target.id, userId: req.user.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }) : [];
  res.json({ highlights: highlights.map(presentHighlight) });
});
const createHighlight = wrap(async (req, res) => {
  if (!validateSelector(req.body?.selector)) throw fail(400, 'El fragmento seleccionado no es válido.');
  const result = await withPost(req, false, async (db, post, root) => {
    const { selector } = anchorData(root, req.body.selector);
    const target = await targetFor(db, post.id);
    const owned = await db.readerHighlight.findMany({ where: { userId: req.user.id, targetId: target.id } });
    const existing = owned.find((entry) => {
      const current = locate(root, entry.selector)?.selector;
      return current?.start === selector.start && current?.end === selector.end;
    });
    if (existing) return { highlight: presentHighlight(existing), created: false };
    const highlight = await db.readerHighlight.create({ data: { targetId: target.id, userId: req.user.id, selector, selectorKey: hash(JSON.stringify(selector)) } });
    return { highlight: presentHighlight(highlight), created: true };
  });
  res.status(result.created ? 201 : 200).json({ highlight: result.highlight });
});
const deleteHighlight = wrap(async (req, res) => {
  await prisma.readerHighlight.deleteMany({ where: { id: req.params.id, userId: req.user.id,
    target: { targetType: TARGET_TYPE, targetId: { in: (await prisma.blogPost.findMany({ where: { slug: req.params.slug }, select: { id: true } })).map((post) => post.id) } } } });
  res.json({ deleted: true });
});

module.exports = { listNotes, listPublicNotes, createNote, updateNote, deleteNote, listHighlights, createHighlight, deleteHighlight };
