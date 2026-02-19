
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log('Checking campaignQA directly...');
        const count = await prisma.campaignQA.count();
        console.log('CampaignQA count:', count);
    } catch (err) {
        console.error('CampaignQA check failed:', err.message);
        console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
    } finally {
        await prisma.$disconnect();
    }
}

check();
