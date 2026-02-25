const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function check() {
    try {
        const campaigns = await prisma.campaign.findMany({
            where: { isActive: true },
            select: { id: true, name: true, type: true, isActive: true }
        });

        const forms = await prisma.monitoringForm.findMany({
            where: { isArchived: false },
            select: { id: true, name: true, campaignId: true, teamName: true }
        });

        const qaUsers = await prisma.user.findMany({
            where: { role: { in: ['QA', 'QA_TL'] } },
            select: { id: true, name: true, role: true }
        });

        const assignments = await prisma.campaignQA.findMany({
            select: { campaignId: true, userId: true, isActive: true }
        });

        const output = { campaigns, forms, qaUsers, assignments };
        fs.writeFileSync('campaign_debug.json', JSON.stringify(output, null, 2));
        console.log('Written to campaign_debug.json');
        console.log('Campaign count:', campaigns.length);
        console.log('Form count:', forms.length);
        console.log('QA user count:', qaUsers.length);
        console.log('Assignment count:', assignments.length);
        console.log('Campaigns:', campaigns.map(c => `${c.name} (${c.type})`).join(', '));
    } catch (err) {
        console.error('ERROR:', err.message);
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
