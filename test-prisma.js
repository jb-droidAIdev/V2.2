
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    process.exit(0);
  } catch (e) {
    console.error('Prisma error:', e);
    process.exit(1);
  }
}

main();
