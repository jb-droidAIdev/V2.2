import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const scores = await prisma.auditScore.findMany({
        where: {
            audit: { campaignId: 'dummy-campaign-1' },
            isFailed: true
        },
        include: {
            audit: { select: { submittedAt: true } },
            criterion: { select: { title: true, categoryName: true } }
        }
    });
    console.log(JSON.stringify(scores, null, 2));
    await prisma.$disconnect();
}

main();
