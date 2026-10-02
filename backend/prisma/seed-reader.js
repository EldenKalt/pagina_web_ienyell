const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

// ── Cuenta de LECTOR para desarrollo ─────────────────────────────────────────
//
// SOLO PARA DESARROLLO EN LOCAL. Rol CLIENT, sin permisos de administración, con
// una contraseña trivial a propósito: existe para poder recorrer el blog y el
// perfil con sesión iniciada, no para proteger nada.
//
// NO LA SIEMBRES EN PRODUCCIÓN. Si esta base de datos llega a ser la de verdad,
// borra este usuario antes.
//
// Correr con:  node prisma/seed-reader.js   (desde backend/)
// ─────────────────────────────────────────────────────────────────────────────
const READER_EMAIL = 'lector@enyell.com';
const READER_PASSWORD = '1234';
const READER_NAME = 'Lector';

async function main() {
  const prisma = new PrismaClient();

  try {
    const passwordHash = await bcrypt.hash(READER_PASSWORD, 10);

    const user = await prisma.user.upsert({
      where: { email: READER_EMAIL },
      update: { passwordHash, name: READER_NAME, role: 'CLIENT', isActive: true },
      create: {
        email: READER_EMAIL,
        passwordHash,
        name: READER_NAME,
        role: 'CLIENT',
        isActive: true,
      },
    });

    console.log(`✓ Reader user created/updated: ${user.email} (role ${user.role}, id ${user.id})`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
