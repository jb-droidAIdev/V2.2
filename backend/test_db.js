const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({ take: 1 });
        console.log('Database connected successfully:', users);
    } catch (e) {
        console.error('Database connection failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
