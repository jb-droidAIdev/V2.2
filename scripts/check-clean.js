const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.count();
    const audits = await prisma.audit.count();
    const campaigns = await prisma.campaign.count();
    console.log(`Summary: Users: ${users}, Audits: ${audits}, Campaigns: ${campaigns}`);
}
main().finally(() => prisma.$disconnect());
