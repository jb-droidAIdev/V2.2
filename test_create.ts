import { PrismaClient, CampaignType } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- Test Create ---');
    const c = await prisma.campaign.create({
        data: {
            name: 'TEST_CAMPAIGN_' + Date.now(),
            type: CampaignType.USER,
        }
    });
    console.log('Created Campaign ID:', c.id);

    const count = await prisma.campaign.count();
    console.log('Total Campaigns Now:', count);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
