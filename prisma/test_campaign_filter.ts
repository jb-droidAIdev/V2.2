import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const campaignCrossFilter = { auditsReceived: { some: {} } };

    const campaignFilter: any = { type: 'USER' };
    if (Object.keys(campaignCrossFilter).length > 0) {
        campaignFilter.audits = { some: { agent: campaignCrossFilter } };
    } else {
        campaignFilter.audits = { some: {} };
    }

    const campaigns = await prisma.campaign.findMany({
        where: campaignFilter
    });
    
    console.log('Filtered campaigns:', campaigns);
}

main().finally(() => prisma.$disconnect());
