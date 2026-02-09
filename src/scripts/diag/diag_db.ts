import { PrismaClient, Role } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const users = await prisma.user.findMany({
            take: 10,
            select: { id: true, name: true, role: true, employeeTeam: true }
        });
        console.log('Sample Users:', JSON.stringify(users, null, 2));

        const audits = await prisma.audit.findMany({
            take: 5,
            select: { id: true, agentId: true, campaignId: true }
        });
        console.log('Sample Audits:', JSON.stringify(audits, null, 2));

        const qaAssignments = await prisma.campaignQA.findMany({
            take: 5
        });
        console.log('QA Assignments:', JSON.stringify(qaAssignments, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
