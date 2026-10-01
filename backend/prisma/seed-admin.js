const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

// ── Edita estas variables antes de correr el script ──────────────────────────
const ADMIN_EMAIL = 'imvuemailjunna@gmail.com';
const ADMIN_PASSWORD = '6tm8ndfxYT';
const ADMIN_NAME = 'Enyell';
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = new PrismaClient();

  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { passwordHash, name: ADMIN_NAME, role: 'ADMIN' },
      create: { email: ADMIN_EMAIL, passwordHash, name: ADMIN_NAME, role: 'ADMIN' },
    });

    console.log(`✓ Admin user created/updated: ${ADMIN_EMAIL}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
