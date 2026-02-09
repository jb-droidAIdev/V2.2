"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const opsTls = await prisma.user.findMany({
            where: { role: client_1.Role.OPS_TL },
            select: { id: true, name: true, employeeTeam: true }
        });
        console.log('OPS TLs:', JSON.stringify(opsTls, null, 2));
        for (const tl of opsTls) {
            console.log(`Checking TL: ${tl.name} (Team: ${tl.employeeTeam})`);
            const agentsInTeam = await prisma.user.findMany({
                where: { employeeTeam: tl.employeeTeam, role: client_1.Role.AGENT },
                select: { id: true, name: true }
            });
            console.log(`Agents in same team: ${agentsInTeam.length}`);
            const campaignAssignments = await prisma.campaignQA.findMany({
                where: { userId: tl.id },
                include: { campaign: true }
            });
            console.log(`Campaign Assignments: ${campaignAssignments.length}`);
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
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=diag_ops_tl.js.map