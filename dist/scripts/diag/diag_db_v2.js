"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const tl = await prisma.user.findFirst({
            where: { role: client_1.Role.OPS_TL }
        });
        if (!tl) {
            console.log('No OPS TL found');
            return;
        }
        console.log(`TL: ${tl.name} | Team: ${tl.employeeTeam}`);
        const agents = await prisma.user.findMany({
            where: { role: client_1.Role.AGENT },
            take: 20,
            select: { name: true, employeeTeam: true }
        });
        console.log('Sample Agents:', JSON.stringify(agents, null, 2));
        const campaigns = await prisma.campaign.findMany({
            take: 20,
            select: { id: true, name: true }
        });
        console.log('Sample Campaigns:', JSON.stringify(campaigns, null, 2));
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
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=diag_db_v2.js.map