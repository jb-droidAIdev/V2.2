import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const campaigns = await prisma.campaign.findMany({
        where: { audits: { some: {} } },
        select: { name: true }
    });
    console.log('Campaigns with audits:', campaigns);
}

main().finally(() => prisma.$disconnect());
