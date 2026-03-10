import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const audits = await prisma.audit.findMany({
        take: 10,
        orderBy: { submittedAt: 'desc' },
        select: {
            id: true,
            submittedAt: true,
            campaignId: true,
            campaign: { select: { name: true } },
            agentId: true,
            agent: { select: { name: true } }
        }
    });
    console.log(JSON.stringify(audits, null, 2));
    await prisma.$disconnect();
}

main();
