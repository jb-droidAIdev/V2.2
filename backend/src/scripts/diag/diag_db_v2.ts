import { PrismaClient, Role } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const tl = await prisma.user.findFirst({
            where: { role: Role.OPS_TL }
        });
        if (!tl) {
            console.log('No OPS TL found');
            return;
        }

        console.log(`TL: ${tl.name} | Team: ${tl.employeeTeam}`);

        // Find some agents and their teams
        const agents = await prisma.user.findMany({
            where: { role: Role.AGENT },
            take: 20,
            select: { name: true, employeeTeam: true }
        });
        console.log('Sample Agents:', JSON.stringify(agents, null, 2));

        // Find campaigns and their names
        const campaigns = await prisma.campaign.findMany({
            take: 20,
            select: { id: true, name: true }
        });
        console.log('Sample Campaigns:', JSON.stringify(campaigns, null, 2));

        // Check audits and the agent's team at the time
        const audits = await prisma.audit.findMany({
            take: 10,
            include: {
                agent: { select: { employeeTeam: true } },
                campaign: { select: { name: true } }
            }
        });
        console.log('Sample Audits:', JSON.stringify(audits.map(a => ({
            id: a.id,
            agentTeam: a.agent.employeeTeam,
            campaign: a.campaign.name
        })), null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
