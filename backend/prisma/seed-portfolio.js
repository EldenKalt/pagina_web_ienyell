const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'portraits', label: 'Portraits & Characters', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z', order: 1 },
  { slug: 'fiction', label: 'Fiction & Fantasy', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5', order: 2 },
  { slug: 'fanart', label: 'Fan Art', icon: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', order: 3 },
  { slug: 'nsfw', label: 'NSFW / Mature', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z', order: 4 },
  { slug: 'furry', label: 'Anthro / Furry', icon: 'M12 2c1.1 0 2 .9 2 2 0 .74-.4 1.39-1 1.73V7h1c1.1 0 2 .9 2 2v1h4v2h-4v1c0 1.1-.9 2-2 2h-1v3.27c.6.34 1 .99 1 1.73 0 1.1-.9 2-2 2s-2-.9-2-2c0-.74.4-1.39 1-1.73V15h-1c-1.1 0-2-.9-2-2v-1H4V10h4V9c0-1.1.9-2 2-2h1V5.73C10.4 5.39 10 4.74 10 4c0-1.1.9-2 2-2z', order: 5 },
  { slug: 'concept-art', label: 'Concept Art', icon: 'M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15l3.5-4.5 2.5 3.01L14.5 9l4.5 6H5z', order: 6 },
  { slug: 'horror', label: 'Horror & Gore', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z', order: 7 },
  { slug: 'sketches', label: 'Sketches & WIPs', icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', order: 8 },
];

async function main() {
  for (const category of CATEGORIES) {
    const { slug, label, icon, order } = category;

    await prisma.portfolioCategory.upsert({
      where: { slug },
      update: { label, icon, order },
      create: { slug, label, icon, order },
    });
  }

  console.log(`${CATEGORIES.length} categorías de portfolio creadas o actualizadas.`);
}

main()
  .catch((error) => {
    console.error('No se pudieron sembrar las categorías del portfolio:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
