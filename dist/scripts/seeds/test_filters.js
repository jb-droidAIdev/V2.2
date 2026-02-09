"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        const dummyUser = {
            id: 'some-id',
            role: 'OPS_TL',
            employeeTeam: 'OPS TL'
        };
        const role = String(dummyUser.role || '').toUpperCase();
        const isStaff = ['ADMIN', 'QA', 'QA_TL', 'QA_MANAGER', 'OPS_TL', 'OPS_MANAGER', 'SDM'].includes(role);
        console.log(`Testing with role: ${role}, isStaff: ${isStaff}`);
        const visibilityFilter = {};
        if (!isStaff && role !== 'AGENT') {
            visibilityFilter.employeeTeam = dummyUser.employeeTeam;
        }
        const auditedAgents = await prisma.user.findMany({
            where: {
                role: client_1.Role.AGENT,
                ...(!isStaff ? visibilityFilter : {})
            },
            select: { id: true, name: true },
            take: 10,
            orderBy: { name: 'asc' }
        });
        console.log(`Found ${auditedAgents.length} agents`);
        if (auditedAgents.length > 0) {
            console.log('First agent:', auditedAgents[0]);
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
//# sourceMappingURL=test_filters.js.map