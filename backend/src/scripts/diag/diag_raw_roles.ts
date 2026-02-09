import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const roles = await prisma.$queryRaw`SELECT role, count(*) FROM "User" GROUP BY role`;
        console.log('Database Role Distribution:', roles);

        const samples = await prisma.user.findMany({
            take: 5,
            select: { id: true, name: true, role: true }
        });
        console.log('Sample Users:', samples);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
