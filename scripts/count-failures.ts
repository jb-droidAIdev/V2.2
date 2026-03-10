import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const count = await prisma.auditScore.count({
        where: { isFailed: true }
    });
    console.log('Total failed scores:', count);
    await prisma.$disconnect();
}

main();
