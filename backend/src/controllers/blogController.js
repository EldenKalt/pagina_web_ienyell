const prisma = require("../lib/prisma");
const { publishDueBlogPosts } = require("../services/publishingScheduler");
const { sanitizeArticleHtml } = require("../utils/articleHtml");
const { paragraphHtml } = require("../utils/annotationContent");
const { withBlogStats } = require('../utils/blogStats');
const { BLOG_AUTHOR_SELECT } = require('../utils/blogMetadata');

const ADMIN_POST_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverUrl: true,
  content: true,
  notesEnabled: true,
  commentsEnabled: true,
  shareCount: true,
  isPublished: true,
  publishedAt: true,
  keywords: true,
  relatedPostIds: true,
  relatedProductIds: true,
  seriesId: true,
  series: {
    select: { id: true, name: true, slug: true }
  },
  createdAt: true,
  updatedAt: true,
  author: { select: BLOG_AUTHOR_SELECT }
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

const SERIES_POST_SELECT = {
  id: true,
  content: true,
  slug: true,
  title: true,
  excerpt: true,
  coverUrl: true,
  publishedAt: true,
  updatedAt: true,
  keywords: true,
  shareCount: true,
  commentsEnabled: true
};

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
    const content = typeof payload.content === "string" ? sanitizeArticleHtml(payload.content) : "";
    if (!hasMeaningfulContent(content)) {
      return { error: "El contenido es obligatorio" };
    }
    data.content = paragraphHtml(content);
  }

  if (Object.hasOwn(payload, "excerpt")) {
    const excerpt = String(payload.excerpt || "").trim();
    if (excerpt.length > 200) {
      return { error: "El extracto no puede superar 200 caracteres" };
    }
    data.excerpt = excerpt || null;
  }

  for (const field of ["notesEnabled", "commentsEnabled"]) {
    if (Object.hasOwn(payload, field)) {
      if (typeof payload[field] !== "boolean") return { error: "La opción de notas/comentarios debe ser booleana" };
      data[field] = payload[field];
    }
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
    if (data.slug === "archive") {
      return { error: "El slug archive está reservado para el archivo del blog" };
    }
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
    const series = String(req.query.series || "").trim();

    // Built once and shared by both queries below — if the count used a different
    // `where`, totalPages would not match the rows actually returned.
    const where = { isPublished: true };

    // Topic is a separate AND condition, not part of the search OR: filtering by a
    // category and then searching within it must narrow, not widen.
    if (topic) {
      where.keywords = { has: topic };
    }

    if (series) {
      where.series = { is: { name: series } };
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
          content: true,
          excerpt: true,
          coverUrl: true,
          publishedAt: true,
          keywords: true,
          shareCount: true,
          commentsEnabled: true,
          series: {
            select: { name: true, slug: true }
          },
          author: { select: BLOG_AUTHOR_SELECT }
        }
      })
    ]);

    return res.json({
      posts: await withBlogStats(prisma, posts),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    return next(error);
  }
}

async function listPublicTopics(_req, res, next) {
  try {
    await publishDueBlogPosts();
    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { keywords: true }
    });
    const topics = [...new Set(posts.flatMap((post) => post.keywords || []))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    return res.json({ topics });
  } catch (error) {
    return next(error);
  }
}

async function getPublicSeries(req, res, next) {
  try {
    await publishDueBlogPosts();
    const series = await prisma.blogSeries.findUnique({
      where: { slug: String(req.params.slug || "") },
      select: {
        id: true,
        name: true,
        slug: true,
        summary: true,
        category: true,
        goal: true,
        audience: true,
        introPost: { select: { ...SERIES_POST_SELECT, isPublished: true, seriesId: true } },
        posts: {
          where: { isPublished: true },
          orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
          select: SERIES_POST_SELECT
        },
        featuredPosts: {
          orderBy: [{ position: "asc" }, { id: "asc" }],
          select: { post: { select: { ...SERIES_POST_SELECT, isPublished: true, seriesId: true } } }
        }
      }
    });
    if (!series) return res.status(404).json({ error: "Serie no encontrada" });

    const publicPost = (post) => {
      if (!post?.isPublished || post.seriesId !== series.id) return null;
      const { isPublished: _isPublished, seriesId: _seriesId, ...summary } = post;
      return summary;
    };
    const { id: _id, ...publicSeries } = series;
    const introPost = publicPost(series.introPost);
    const featuredPosts = series.featuredPosts.map(({ post }) => publicPost(post)).filter(Boolean);
    const enriched = await withBlogStats(prisma, [...series.posts, ...(introPost ? [introPost] : []), ...featuredPosts]);
    const summaries = new Map(enriched.map((post) => [post.id, post]));
    return res.json({
      series: {
        ...publicSeries,
        introPost: introPost ? summaries.get(introPost.id) : null,
        posts: series.posts.map((post) => summaries.get(post.id)),
        featuredPosts: featuredPosts.map((post) => summaries.get(post.id))
      }
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
              content: true,
              excerpt: true,
              coverUrl: true,
              publishedAt: true,
              shareCount: true,
              commentsEnabled: true
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
            title: true,
            seriesId: true
          }
        })
      ]);

    const orderedRelatedPosts = (post.relatedPostIds || [])
      .map((id) => relatedPosts.find((entry) => entry.id === id))
      .filter(Boolean);

      const orderedRelatedProducts = (post.relatedProductIds || [])
        .map((id) => relatedProducts.find((entry) => entry.id === id))
        .filter(Boolean);

      const sequencePosts = post.seriesId
        ? await prisma.blogPost.findMany({
            where: { isPublished: true, seriesId: post.seriesId },
            orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
            select: { id: true, slug: true, title: true, publishedAt: true, seriesId: true }
          })
        : publishedPosts;
      const sequenceIndex = sequencePosts.findIndex((entry) => entry.id === post.id);
      const previousPost = sequenceIndex > 0 ? sequencePosts[sequenceIndex - 1] : null;
      const nextPost = sequenceIndex >= 0 && sequenceIndex < sequencePosts.length - 1
        ? sequencePosts[sequenceIndex + 1]
        : null;

      const { seriesId: _seriesId, series: postSeries, ...publicPost } = post;
      const [enrichedPost, ...enrichedRelatedPosts] = await withBlogStats(prisma, [publicPost, ...orderedRelatedPosts]);
      return res.json({
        ...enrichedPost,
        content: paragraphHtml(publicPost.content, post.id),
        series: postSeries ? { name: postSeries.name, slug: postSeries.slug } : null,
        previousPost,
        nextPost,
        seriesName: post.series?.name || null,
        seriesSlug: post.series?.slug || null,
        sequence: sequenceIndex < 0 ? null : {
          scope: post.seriesId ? "series" : "archive",
          seriesName: post.series?.name || null,
          seriesSlug: post.series?.slug || null,
          position: sequenceIndex + 1,
          total: sequencePosts.length
        },
        relatedPosts: enrichedRelatedPosts,
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
    return res.json({ posts: posts.map((post) => ({ ...post, content: paragraphHtml(post.content, post.id) })) });
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

    if (normalizeSlug(validation.data.slug || validation.data.title) === "archive") {
      return res.status(400).json({ error: "El slug archive está reservado para el archivo del blog" });
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
    ["title", "slug", "content", "excerpt", "coverUrl", "keywords", "relatedPostIds", "relatedProductIds", "isPublished", "publishedAt", "notesEnabled", "commentsEnabled"].forEach((field) => {
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
      if (normalizeSlug(validation.data.title) === "archive") {
        return res.status(400).json({ error: "El slug archive está reservado para el archivo del blog" });
      }
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
  listPublicTopics,
  getPublicSeries,
  getPost,
  listAdmin,
  createPost,
  updatePost,
  togglePublish,
  deletePost
};
