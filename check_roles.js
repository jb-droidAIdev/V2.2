const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('--- Permissions ---');
    const permissions = await prisma.permission.findMany();
    console.log(JSON.stringify(permissions.map(p => ({ code: p.code, module: p.module })), null, 2));

    console.log('\n--- Roles ---');
    const roles = await prisma.userRole.findMany({
        include: {
            permissions: {
                include: { permission: true }
            }
        }
    });
    console.log(JSON.stringify(roles.map(r => ({
        name: r.name,
        perms: r.permissions.map(p => p.permission.code)
    })), null, 2));

    await prisma.$disconnect();
}

check();
