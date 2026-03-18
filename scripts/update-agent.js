const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Updating AGENT permissions...');
    const agentRole = await prisma.userRole.findFirst({ where: { name: 'AGENT' } });
    const coachingReadPerm = await prisma.permission.findFirst({ where: { code: 'COACHING_LOG_READ' }});
    const ackPerm = await prisma.permission.findFirst({ where: { code: 'AUDIT_ACKNOWLEDGE' }});
    const viewOwnPerm = await prisma.permission.findFirst({ where: { code: 'AUDIT_VIEW_OWN' }});
    const dashboardPerm = await prisma.permission.findFirst({ where: { code: 'PAGE_DASHBOARD' }});
    const auditsPerm = await prisma.permission.findFirst({ where: { code: 'PAGE_AUDITS' }});

    if (agentRole) {
        // Remove COACHING_LOG_READ
        if (coachingReadPerm) {
            await prisma.rolePermission.deleteMany({
                where: { roleId: agentRole.id, permissionId: coachingReadPerm.id }
            });
        }
        
        // Ensure Agent has AUDIT_ACKNOWLEDGE, AUDIT_VIEW_OWN, PAGE_DASHBOARD, PAGE_AUDITS
        const permsToAssign = [ackPerm, viewOwnPerm, dashboardPerm, auditsPerm].filter(x => x);
        for (let p of permsToAssign) {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: agentRole.id, permissionId: p.id }},
                create: { roleId: agentRole.id, permissionId: p.id },
                update: {}
            });
        }
        console.log('AGENT permissions updated successfully.');
    }
}

main().finally(() => prisma.$disconnect());
