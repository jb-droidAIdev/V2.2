const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const roles = await prisma.userRole.count();
    const perms = await prisma.permission.count();
    console.log(`Roles: ${roles}, Permissions: ${perms}`);
}
main().finally(() => prisma.$disconnect());
