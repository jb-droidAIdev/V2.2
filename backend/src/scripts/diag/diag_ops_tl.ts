import { PrismaClient, Role } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const opsTls = await prisma.user.findMany({
            where: { role: Role.OPS_TL },
            select: { id: true, name: true, employeeTeam: true }
        });
        console.log('OPS TLs:', JSON.stringify(opsTls, null, 2));

        for (const tl of opsTls) {
            console.log(`Checking TL: ${tl.name} (Team: ${tl.employeeTeam})`);

            const agentsInTeam = await prisma.user.findMany({
                where: { employeeTeam: tl.employeeTeam, role: Role.AGENT },
                select: { id: true, name: true }
            });
            console.log(`Agents in same team: ${agentsInTeam.length}`);

            const campaignAssignments = await prisma.campaignQA.findMany({
                where: { userId: tl.id },
                include: { campaign: true }
            });
            console.log(`Campaign Assignments: ${campaignAssignments.length}`);

            // Check agents in assigned campaigns
            for (const assignment of campaignAssignments) {
                const agentsInCampaign = await prisma.user.count({
                    where: {
                        auditsReceived: {
                            some: { campaignId: assignment.campaignId }
                        }
                    }
                });
                console.log(`Agents in Campaign ${assignment.campaign.name}: ${agentsInCampaign}`);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
