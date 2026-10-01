const prisma = require("../lib/prisma");
const { publishDueBlogPosts } = require("../services/publishingScheduler");

const ADMIN_POST_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverUrl: true,
  content: true,
  isPublished: true,
  publishedAt: true,
  keywords: true,
  relatedPostIds: true,
  relatedProductIds: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true
    }
  }
};

function parsePositiveInt(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, maximum);
}

function parsePostId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function slugifyTitle(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "") || "post";
}

function normalizeSlug(value) {
  return slugifyTitle(value).slice(0, 60).replace(/-+$/g, "") || "post";
}

function hasMeaningfulContent(content) {
  return String(content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, "")
    .length > 0;
}

function validateOptionalUrl(value) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }

  try {
    const url = new URL(String(value).trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return { error: "La URL de portada debe usar http o https" };
    }
    return { value: url.toString() };
  } catch (_error) {
    return { error: "La URL de portada no es válida" };
  }
}

function parseOptionalDateTime(value) {
  if (value === undefined) {
    return { skip: true };
  }

  if (value === null || value === "") {
    return { value: null };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "La fecha de publicación no es válida" };
  }

  return { value: parsed };
}

function validatePostPayload(payload, { partial = false } = {}) {
  const data = {};

  if (!partial || Object.hasOwn(payload, "title")) {
    const title = String(payload.title || "").trim();
    if (!title) {
      return { error: "El título es obligatorio" };
    }
    data.title = title;
  }

  if (!partial || Object.hasOwn(payload, "content")) {
    const content = typeof payload.content === "string" ? payload.content : "";
    if (!hasMeaningfulContent(content)) {
      return { error: "El contenido es obligatorio" };
    }
    data.content = content;
  }

  if (Object.hasOwn(payload, "excerpt")) {
    const excerpt = String(payload.excerpt || "").trim();
    if (excerpt.length > 200) {
      return { error: "El extracto no puede superar 200 caracteres" };
    }
    data.excerpt = excerpt || null;
  }

  if (Object.hasOwn(payload, "coverUrl")) {
    const cover = validateOptionalUrl(payload.coverUrl);
    if (cover.error) {
      return { error: cover.error };
    }
    data.coverUrl = cover.value;
  }

  if (Object.hasOwn(payload, "keywords")) {
    data.keywords = Array.isArray(payload.keywords) ? payload.keywords.map(String).filter(Boolean) : [];
  }

  if (Object.hasOwn(payload, "relatedPostIds")) {
    data.relatedPostIds = Array.isArray(payload.relatedPostIds)
      ? payload.relatedPostIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      : [];
  }

  if (Object.hasOwn(payload, "relatedProductIds")) {
    data.relatedProductIds = Array.isArray(payload.relatedProductIds)
      ? payload.relatedProductIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
      : [];
  }

  if (Object.hasOwn(payload, "slug")) {
    data.slug = normalizeSlug(payload.slug);
  }

  if (Object.hasOwn(payload, "isPublished")) {
    data.isPublished = Boolean(payload.isPublished);
  }

  if (Object.hasOwn(payload, "publishedAt")) {
    const publishedAt = parseOptionalDateTime(payload.publishedAt);
    if (publishedAt.error) {
      return { error: publishedAt.error };
    }
    if (!publishedAt.skip) {
      data.publishedAt = publishedAt.value;
    }
  }

  return { data };
}

async function uniqueSlug(value, excludeId = null) {
  const base = normalizeSlug(value);
  let candidate = base;
  let suffix = 2;

  while (await prisma.blogPost.findFirst({
    where: {
      slug: candidate,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true }
  })) {
    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, 60 - suffixText.length).replace(/-+$/g, "")}${suffixText}`;
    suffix += 1;
  }

  return candidate;
}

async function listPublic(req, res, next) {
  try {
    await publishDueBlogPosts();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 6, 24);
    const search = String(req.query.search || "").trim();
    const topic = String(req.query.topic || "").trim();

    // Built once and shared by both queries below — if the count used a different
    // `where`, totalPages would not match the rows actually returned.
    const where = { isPublished: true };

    // Topic is a separate AND condition, not part of the search OR: filtering by a
    // category and then searching within it must narrow, not widen.
    if (topic) {
      where.keywords = { has: topic };
    }

    if (search) {
      // `content` is deliberately excluded: it stores HTML, so a substring match
      // would hit tag names and attributes rather than prose.
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
        { keywords: { has: search } }
      ];
    }

    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: [
          { publishedAt: "desc" },
          { id: "desc" }
        ],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverUrl: true,
          publishedAt: true,
          keywords: true,
          author: {
            select: {
              name: true
            }
          }
        }
      })
    ]);

    return res.json({
      posts,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    return next(error);
  }
}

async function getPost(req, res, next) {
  try {
    await publishDueBlogPosts();
    const post = await prisma.blogPost.findFirst({
      where: {
        slug: String(req.params.slug || ""),
        isPublished: true
      },
      select: ADMIN_POST_SELECT
    });

    if (!post) {
      return res.status(404).json({ error: "Post no encontrado" });
    }

      const [relatedPosts, relatedProducts, publishedPosts] = await Promise.all([
        post.relatedPostIds?.length
          ? prisma.blogPost.findMany({
              where: {
                isPublished: true,
              id: { in: post.relatedPostIds },
              NOT: { id: post.id }
            },
            select: {
              id: true,
              slug: true,
              title: true,
              excerpt: true,
              coverUrl: true,
              publishedAt: true
            }
          })
        : Promise.resolve([]),
      post.relatedProductIds?.length
        ? prisma.product.findMany({
            where: {
              id: { in: post.relatedProductIds },
              isActive: true
            },
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              type: true,
                launchPrice: true
              }
            })
          : Promise.resolve([]),
        prisma.blogPost.findMany({
          where: {
            isPublished: true
          },
          orderBy: [
            { publishedAt: "desc" },
            { id: "desc" }
          ],
          select: {
            id: true,
            slug: true,
            title: true
          }
        })
      ]);

    const orderedRelatedPosts = (post.relatedPostIds || [])
      .map((id) => relatedPosts.find((entry) => entry.id === id))
      .filter(Boolean);

      const orderedRelatedProducts = (post.relatedProductIds || [])
        .map((id) => relatedProducts.find((entry) => entry.id === id))
        .filter(Boolean);

      const currentIndex = publishedPosts.findIndex((entry) => entry.id === post.id);
      const previousPost = currentIndex > 0 ? publishedPosts[currentIndex - 1] : null;
      const nextPost = currentIndex >= 0 && currentIndex < publishedPosts.length - 1
        ? publishedPosts[currentIndex + 1]
        : null;

      return res.json({
        ...post,
        previousPost,
        nextPost,
        relatedPosts: orderedRelatedPosts,
        relatedProducts: orderedRelatedProducts
      });
  } catch (error) {
    return next(error);
  }
}

async function listAdmin(_req, res, next) {
  try {
    await publishDueBlogPosts();
    const posts = await prisma.blogPost.findMany({
      orderBy: { updatedAt: "desc" },
      select: ADMIN_POST_SELECT
    });
    return res.json({ posts });
  } catch (error) {
    return next(error);
  }
}

async function createPost(req, res, next) {
  try {
    const validation = validatePostPayload(req.body || {});
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const post = await prisma.blogPost.create({
      data: {
        ...validation.data,
        slug: await uniqueSlug(validation.data.slug || validation.data.title),
        isPublished: false,
        authorId: req.user.id
      },
      select: ADMIN_POST_SELECT
    });

    return res.status(201).json(post);
  } catch (error) {
    return next(error);
  }
}

async function updatePost(req, res, next) {
  try {
    const id = parsePostId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID de post inválido" });
    }

    const existing = await prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        isPublished: true,
        publishedAt: true
      }
    });
    if (!existing) {
      return res.status(404).json({ error: "Post no encontrado" });
    }

    const allowedPayload = {};
    ["title", "slug", "content", "excerpt", "coverUrl", "keywords", "relatedPostIds", "relatedProductIds", "isPublished", "publishedAt"].forEach((field) => {
      if (Object.hasOwn(req.body || {}, field)) {
        allowedPayload[field] = req.body[field];
      }
    });
    if (!Object.keys(allowedPayload).length) {
      return res.status(400).json({ error: "No hay campos para actualizar" });
    }

    const validation = validatePostPayload(allowedPayload, { partial: true });
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    if (validation.data.slug) {
      validation.data.slug = await uniqueSlug(validation.data.slug, id);
    } else if (
      validation.data.title
      && validation.data.title !== existing.title
      && existing.publishedAt === null
    ) {
      validation.data.slug = await uniqueSlug(validation.data.title, id);
    }

    if (validation.data.isPublished === true) {
      validation.data.publishedAt = new Date();
    } else if (validation.data.isPublished === false && !Object.hasOwn(validation.data, "publishedAt")) {
      validation.data.publishedAt = null;
    } else if (
      validation.data.isPublished === false
      && validation.data.publishedAt
      && validation.data.publishedAt.getTime() <= Date.now()
    ) {
      validation.data.isPublished = true;
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: validation.data,
      select: ADMIN_POST_SELECT
    });
    return res.json(post);
  } catch (error) {
    return next(error);
  }
}

async function togglePublish(req, res, next) {
  try {
    const id = parsePostId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID de post inválido" });
    }

    const existing = await prisma.blogPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        isPublished: true,
        publishedAt: true
      }
    });
    if (!existing) {
      return res.status(404).json({ error: "Post no encontrado" });
    }

    const nextPublished = !existing.isPublished;
    if (
      nextPublished
      && (!existing.title.trim() || !hasMeaningfulContent(existing.content))
    ) {
      return res.status(400).json({
        error: "El post necesita título y contenido antes de publicarse"
      });
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: nextPublished,
        publishedAt: nextPublished ? new Date() : null
      },
      select: ADMIN_POST_SELECT
    });
    return res.json(post);
  } catch (error) {
    return next(error);
  }
}

async function deletePost(req, res, next) {
  try {
    const id = parsePostId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID de post inválido" });
    }

    const result = await prisma.blogPost.deleteMany({ where: { id } });
    if (!result.count) {
      return res.status(404).json({ error: "Post no encontrado" });
    }
    return res.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPublic,
  getPost,
  listAdmin,
  createPost,
  updatePost,
  togglePublish,
  deletePost
};
