"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const roles = await prisma.user.groupBy({
            by: ['role'],
            _count: { _all: true }
        });
        console.log('Role Distribution:', JSON.stringify(roles, null, 2));
        const agentRole = roles.find(r => r.role === 'AGENT');
        if (agentRole) {
            const sampleAgent = await prisma.user.findFirst({
                where: { role: 'AGENT' }
            });
            console.log('Sample Agent:', JSON.stringify(sampleAgent, null, 2));
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
//# sourceMappingURL=diag_roles.js.map