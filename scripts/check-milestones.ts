import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const campaigns = await prisma.campaign.findMany({
        select: { id: true, name: true, ztpMilestones: true }
    });
    console.log(JSON.stringify(campaigns, null, 2));
    await prisma.$disconnect();
}

main();
