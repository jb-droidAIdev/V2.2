
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const userCount = await prisma.user.count();
        const campaignCount = await prisma.campaign.count();
        console.log(`Users: ${userCount}, Campaigns: ${campaignCount}`);
        const users = await prisma.user.findMany({ take: 5 });
        console.log('Sample Users:', JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
