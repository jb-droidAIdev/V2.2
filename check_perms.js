const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const perms = await prisma.permission.findMany({
    where: { code: 'COACHING_LOG_READ' }
  });
  console.log(JSON.stringify(perms, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
