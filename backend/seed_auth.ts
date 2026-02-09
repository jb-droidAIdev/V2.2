import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const MASTER_PERMISSIONS = [
    { code: 'PAGE_DASHBOARD', description: 'Access Dashboard', module: 'Page Access' },
    { code: 'PAGE_DOSSIER', description: 'Access Dossier (Users)', module: 'Page Access' },
    { code: 'PAGE_AUDITS', description: 'Access Audits', module: 'Page Access' },
    { code: 'PAGE_EVALUATE', description: 'Access Evaluation', module: 'Page Access' },
    { code: 'PAGE_CALIBRATION', description: 'Access Calibration', module: 'Page Access' },
    { code: 'PAGE_FORMS', description: 'Access Forms', module: 'Page Access' },
    { code: 'PAGE_ADMIN', description: 'Access Admin Console', module: 'Page Access' },
    { code: 'DASHBOARD_VIEW', description: 'View Advanced Stats', module: 'System' },
    { code: 'AUDIT_CREATE', description: 'Create Audits', module: 'Audit' },
    { code: 'AUDIT_VIEW_SELF', description: 'View Own Audits', module: 'Audit' },
    { code: 'AUDIT_VIEW_TEAM', description: 'View Team Audits', module: 'Audit' },
    { code: 'AUDIT_VIEW_ALL', description: 'View All Audits', module: 'Audit' },
    { code: 'AUDIT_DELETE', description: 'Delete Audits', module: 'Audit' },
    { code: 'DISPUTE_CREATE', description: 'File Disputes', module: 'Dispute' },
    { code: 'DISPUTE_RESOLVE', description: 'Resolve Disputes', module: 'Dispute' },
    { code: 'USER_MANAGE', description: 'Manage Users & Roles', module: 'System' },
    { code: 'CAMPAIGN_MANAGE', description: 'Manage Campaigns', module: 'System' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
    'ADMIN': MASTER_PERMISSIONS.map(p => p.code),
    'QA_TL': ['PAGE_DASHBOARD', 'PAGE_AUDITS', 'PAGE_EVALUATE', 'AUDIT_VIEW_ALL', 'DISPUTE_RESOLVE', 'USER_MANAGE', 'PAGE_CALIBRATION', 'PAGE_DOSSIER', 'PAGE_FORMS'],
    'QA': ['PAGE_DASHBOARD', 'PAGE_AUDITS', 'PAGE_EVALUATE', 'AUDIT_CREATE', 'AUDIT_VIEW_ALL', 'DISPUTE_RESOLVE'],
    'OPS_TL': ['PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS'],
    'AGENT': ['PAGE_DASHBOARD', 'AUDIT_VIEW_SELF', 'DISPUTE_CREATE'],
    'OPS_MANAGER': ['PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS'],
    'QA_MANAGER': ['PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_EVALUATE', 'PAGE_FORMS', 'PAGE_CALIBRATION'],
    'SDM': ['PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_CALIBRATION']
};

async function main() {
    console.log('--- Seeding Auth System ---');

    // 1. Upsert Permissions
    for (const p of MASTER_PERMISSIONS) {
        await (prisma as any).permission.upsert({
            where: { code: p.code },
            update: { description: p.description, module: p.module },
            create: p
        });
    }
    console.log('Permissions seeded.');

    const allPerms = await (prisma as any).permission.findMany();
    const permMap = new Map(allPerms.map((p: any) => [p.code, p.id]));

    // 2. Upsert Roles and Link Permissions
    for (const [roleName, codes] of Object.entries(ROLE_PERMISSIONS)) {
        const role = await (prisma as any).userRole.upsert({
            where: { name: roleName },
            update: { description: `${roleName} role` },
            create: { name: roleName, description: `${roleName} role` }
        });

        // Clear existing links to avoid duplicates
        await (prisma as any).rolePermission.deleteMany({
            where: { roleId: role.id }
        });

        // Create new links
        for (const code of codes) {
            const permId = permMap.get(code);
            if (permId) {
                await (prisma as any).rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: permId
                    }
                });
            }
        }
        console.log(`Role ${roleName} seeded with ${codes.length} permissions.`);
    }

    // 3. Sync Users
    const roles = await (prisma as any).userRole.findMany();
    const roleMap = new Map(roles.map((r: any) => [r.name, r.id]));

    const users = await (prisma as any).user.findMany();
    let updatedCount = 0;
    for (const user of users) {
        const roleId = roleMap.get(user.role);
        if (roleId) {
            await (prisma as any).user.update({
                where: { id: user.id },
                data: { roleId }
            });
            updatedCount++;
        }
    }
    console.log(`Synced ${updatedCount} users to their Role IDs.`);
}

main()
    .catch((e: Error) => {
        console.error(e);
    })
    .finally(async () => {
        await (prisma as any).$disconnect();
    });
