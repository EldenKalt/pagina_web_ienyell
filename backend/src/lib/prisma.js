const { PrismaClient } = require("@prisma/client");

const globalForPrisma = global;

const prisma = globalForPrisma.__utilPrisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__utilPrisma = prisma;
}

module.exports = prisma;
