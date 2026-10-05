const { sanitizeArticleHtml } = require("../utils/articleHtml");

// Data cleanup only: no schema migration, deletion, publication or slug changes.
// Default is read-only. Compare-and-set protects edits made during the scan.
async function sanitizeBlogPosts(prisma, { apply = false, batchSize = 100 } = {}) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new TypeError("batchSize debe ser un entero positivo");
  }
  const summary = { mode: apply ? "apply" : "dry-run", scanned: 0, changed: 0, updated: 0, conflicts: 0 };
  let lastId = 0;

  while (true) {
    const posts = await prisma.blogPost.findMany({
      where: { id: { gt: lastId } },
      orderBy: { id: "asc" },
      take: batchSize,
      select: { id: true, content: true }
    });
    if (!posts.length) break;

    for (const post of posts) {
      summary.scanned += 1;
      const content = sanitizeArticleHtml(post.content);
      if (content !== post.content) {
        summary.changed += 1;
        if (apply) {
          const result = await prisma.blogPost.updateMany({
            where: { id: post.id, content: post.content },
            data: { content }
          });
          if (result.count === 1) summary.updated += 1;
          else summary.conflicts += 1;
        }
      }
    }
    lastId = posts[posts.length - 1].id;
  }
  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--apply", "--dry-run"].includes(arg)) || new Set(args).size > 1) {
    throw new Error("Usa --dry-run (por defecto) o --apply");
  }
  require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
  const prisma = require("../lib/prisma");
  try {
    const summary = await sanitizeBlogPosts(prisma, { apply: args.includes("--apply") });
    console.log(JSON.stringify(summary));
    if (summary.conflicts) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(() => {
    // Prisma errors can contain connection details or raw HTML; never print them.
    console.error("No se pudo completar la limpieza del blog. Revisa conexión, permisos y argumentos; conserva el modo de maqueta.");
    process.exitCode = 1;
  });
}

module.exports = { sanitizeBlogPosts };
