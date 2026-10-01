const prisma = require("../lib/prisma");

const LEGAL_TITLES = {
  terminos: "Términos y Condiciones",
  privacidad: "Política de Privacidad",
  cookies: "Política de Cookies"
};

function validateSlug(req, res) {
  const slug = String(req.params.slug || "").trim().toLowerCase();
  if (!Object.hasOwn(LEGAL_TITLES, slug)) {
    res.status(404).json({ error: "Página legal no encontrada" });
    return null;
  }
  return slug;
}

async function findLegalPage(slug) {
  if (prisma.legalPage) {
    return prisma.legalPage.findUnique({
      where: { slug },
      select: {
        slug: true,
        title: true,
        content: true,
        updatedAt: true
      }
    });
  }

  const rows = await prisma.$queryRaw`
    SELECT "slug", "title", "content", "updatedAt"
    FROM "LegalPage"
    WHERE "slug" = ${slug}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function saveLegalPage({ slug, title, content, updatedById }) {
  if (prisma.legalPage) {
    return prisma.legalPage.upsert({
      where: { slug },
      update: {
        content,
        updatedById,
        ...(title !== undefined ? { title } : {})
      },
      create: {
        slug,
        title: title || LEGAL_TITLES[slug],
        content,
        updatedById
      },
      select: {
        slug: true,
        title: true,
        content: true,
        updatedAt: true
      }
    });
  }

  const resolvedTitle = title || LEGAL_TITLES[slug];
  const rows = title !== undefined
    ? await prisma.$queryRaw`
        INSERT INTO "LegalPage" ("slug", "title", "content", "updatedAt", "updatedById")
        VALUES (${slug}, ${resolvedTitle}, ${content}, CURRENT_TIMESTAMP, ${updatedById})
        ON CONFLICT ("slug") DO UPDATE SET
          "title" = EXCLUDED."title",
          "content" = EXCLUDED."content",
          "updatedAt" = CURRENT_TIMESTAMP,
          "updatedById" = EXCLUDED."updatedById"
        RETURNING "slug", "title", "content", "updatedAt"
      `
    : await prisma.$queryRaw`
        INSERT INTO "LegalPage" ("slug", "title", "content", "updatedAt", "updatedById")
        VALUES (${slug}, ${resolvedTitle}, ${content}, CURRENT_TIMESTAMP, ${updatedById})
        ON CONFLICT ("slug") DO UPDATE SET
          "content" = EXCLUDED."content",
          "updatedAt" = CURRENT_TIMESTAMP,
          "updatedById" = EXCLUDED."updatedById"
        RETURNING "slug", "title", "content", "updatedAt"
      `;
  return rows[0];
}

async function getPage(req, res, next) {
  try {
    const slug = validateSlug(req, res);
    if (!slug) {
      return;
    }

    const page = await findLegalPage(slug);

    if (!page) {
      return res.status(404).json({ error: "Página legal no encontrada" });
    }

    return res.json(page);
  } catch (error) {
    return next(error);
  }
}

async function updatePage(req, res, next) {
  try {
    const slug = validateSlug(req, res);
    if (!slug) {
      return;
    }

    const { title, content } = req.body || {};
    if (typeof content !== "string") {
      return res.status(400).json({ error: "El contenido es requerido" });
    }
    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return res.status(400).json({ error: "El título no es válido" });
    }

    const page = await saveLegalPage({
      slug,
      title: title?.trim(),
      content,
      updatedById: req.user.id
    });

    return res.json(page);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPage,
  updatePage
};
