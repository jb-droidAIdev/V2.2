const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const permissions = await prisma.permission.findMany();
    console.log(JSON.stringify(permissions, null, 2));
    await prisma.$disconnect();
}

check();
