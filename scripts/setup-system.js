const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('🏗️  Setting up Clean System (Roles, Permissions, Admin)...');

    // 1. Permissions
    const permissions = [
        { code: 'USER_VIEW', description: 'View users', module: 'Users' },
        { code: 'USER_MANAGE', description: 'Create, update, and delete users', module: 'Users' },
        { code: 'CAMPAIGN_VIEW', description: 'View campaigns', module: 'Campaigns' },
        { code: 'CAMPAIGN_MANAGE', description: 'Create, update, and delete campaigns', module: 'Campaigns' },
        { code: 'FORM_VIEW', description: 'View monitoring forms', module: 'Forms' },
        { code: 'FORM_MANAGE', description: 'Create, update, and delete forms', module: 'Forms' },
        { code: 'FORM_PUBLISH', description: 'Publish form versions', module: 'Forms' },
        { code: 'AUDIT_VIEW', description: 'View audits', module: 'Audits' },
        { code: 'AUDIT_CREATE', description: 'Create and conduct audits', module: 'Audits' },
        { code: 'AUDIT_RELEASE', description: 'Release audits to agents', module: 'Audits' },
        { code: 'AUDIT_VIEW_ALL', description: 'View all audits across campaigns', module: 'Audits' },
        { code: 'DISPUTE_VIEW', description: 'View disputes', module: 'Disputes' },
        { code: 'DISPUTE_CREATE', description: 'Create disputes', module: 'Disputes' },
        { code: 'DISPUTE_REVIEW', description: 'Review and resolve disputes', module: 'Disputes' },
        { code: 'CALIBRATION_VIEW', description: 'View calibration sessions', module: 'Calibration' },
        { code: 'CALIBRATION_MANAGE', description: 'Create and manage calibration sessions', module: 'Calibration' },
        { code: 'CALIBRATION_PARTICIPATE', description: 'Participate in calibration sessions', module: 'Calibration' },
        { code: 'CALIBRATION_APPROVE_ANCHOR', description: 'Approve calibration anchors', module: 'Calibration' },
        { code: 'TICKET_UPLOAD', description: 'Upload ticket batches', module: 'Tickets' },
        { code: 'TICKET_VIEW', description: 'View tickets', module: 'Tickets' },
        { code: 'SAMPLING_RUN', description: 'Run sampling operations', module: 'Sampling' },
        { code: 'DASHBOARD_VIEW', description: 'View dashboard and analytics', module: 'Dashboard' },
        { code: 'REPORTS_VIEW', description: 'View reports', module: 'Reports' },
        { code: 'REPORTS_EXPORT', description: 'Export reports', module: 'Reports' },
        { code: 'SYSTEM_ADMIN', description: 'Full system administration access', module: 'System' },
        { code: 'PAGE_DASHBOARD', description: 'Access to Dashboard page', module: 'Navigation' },
        { code: 'PAGE_DOSSIER', description: 'Access to Dossier page', module: 'Navigation' },
        { code: 'PAGE_FORMS', description: 'Access to Forms page', module: 'Navigation' },
        { code: 'PAGE_AUDITS', description: 'Access to Audits page', module: 'Navigation' },
        { code: 'PAGE_EVALUATE', description: 'Access to Evaluate page', module: 'Navigation' },
        { code: 'PAGE_CALIBRATION', description: 'Access to Calibration page', module: 'Navigation' },
    ];

    for (const perm of permissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: {},
            create: perm,
        });
    }
    console.log(`✅ Created ${permissions.length} permissions`);

    // 2. Roles
    const roles = [
        { name: 'AGENT', permissions: ['AUDIT_VIEW', 'DISPUTE_CREATE', 'DISPUTE_VIEW', 'DASHBOARD_VIEW', 'PAGE_DASHBOARD', 'PAGE_AUDITS'] },
        { name: 'QA', permissions: ['AUDIT_VIEW', 'AUDIT_CREATE', 'AUDIT_RELEASE', 'DISPUTE_VIEW', 'DISPUTE_REVIEW', 'FORM_VIEW', 'CAMPAIGN_VIEW', 'TICKET_VIEW', 'DASHBOARD_VIEW', 'REPORTS_VIEW', 'CALIBRATION_VIEW', 'CALIBRATION_PARTICIPATE', 'PAGE_DASHBOARD', 'PAGE_AUDITS', 'PAGE_EVALUATE', 'PAGE_FORMS', 'PAGE_CALIBRATION'] },
        { name: 'QA_TL', permissions: ['AUDIT_VIEW', 'AUDIT_CREATE', 'AUDIT_RELEASE', 'AUDIT_VIEW_ALL', 'DISPUTE_VIEW', 'DISPUTE_REVIEW', 'FORM_VIEW', 'FORM_MANAGE', 'CAMPAIGN_VIEW', 'TICKET_VIEW', 'TICKET_UPLOAD', 'SAMPLING_RUN', 'DASHBOARD_VIEW', 'REPORTS_VIEW', 'REPORTS_EXPORT', 'CALIBRATION_VIEW', 'CALIBRATION_MANAGE', 'CALIBRATION_PARTICIPATE', 'CALIBRATION_APPROVE_ANCHOR', 'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_EVALUATE', 'PAGE_FORMS', 'PAGE_CALIBRATION'] },
        { name: 'OPS_TL', permissions: ['USER_VIEW', 'AUDIT_VIEW', 'AUDIT_VIEW_ALL', 'DISPUTE_VIEW', 'CAMPAIGN_VIEW', 'FORM_VIEW', 'TICKET_VIEW', 'DASHBOARD_VIEW', 'REPORTS_VIEW', 'REPORTS_EXPORT', 'CALIBRATION_VIEW', 'CALIBRATION_APPROVE_ANCHOR', 'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_CALIBRATION'] },
        { name: 'QA_MANAGER', permissions: ['USER_VIEW', 'USER_MANAGE', 'AUDIT_VIEW', 'AUDIT_CREATE', 'AUDIT_RELEASE', 'AUDIT_VIEW_ALL', 'DISPUTE_VIEW', 'DISPUTE_REVIEW', 'FORM_VIEW', 'FORM_MANAGE', 'FORM_PUBLISH', 'CAMPAIGN_VIEW', 'CAMPAIGN_MANAGE', 'TICKET_VIEW', 'TICKET_UPLOAD', 'SAMPLING_RUN', 'DASHBOARD_VIEW', 'REPORTS_VIEW', 'REPORTS_EXPORT', 'CALIBRATION_VIEW', 'CALIBRATION_MANAGE', 'CALIBRATION_PARTICIPATE', 'CALIBRATION_APPROVE_ANCHOR', 'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_EVALUATE', 'PAGE_FORMS', 'PAGE_CALIBRATION'] },
        { name: 'OPS_MANAGER', permissions: ['USER_VIEW', 'USER_MANAGE', 'AUDIT_VIEW', 'AUDIT_VIEW_ALL', 'DISPUTE_VIEW', 'CAMPAIGN_VIEW', 'CAMPAIGN_MANAGE', 'FORM_VIEW', 'TICKET_VIEW', 'DASHBOARD_VIEW', 'REPORTS_VIEW', 'REPORTS_EXPORT', 'CALIBRATION_VIEW', 'CALIBRATION_APPROVE_ANCHOR', 'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS'] },
        { name: 'SDM', permissions: ['USER_VIEW', 'USER_MANAGE', 'AUDIT_VIEW', 'AUDIT_CREATE', 'AUDIT_RELEASE', 'AUDIT_VIEW_ALL', 'DISPUTE_VIEW', 'DISPUTE_REVIEW', 'FORM_VIEW', 'FORM_MANAGE', 'FORM_PUBLISH', 'CAMPAIGN_VIEW', 'CAMPAIGN_MANAGE', 'TICKET_VIEW', 'TICKET_UPLOAD', 'SAMPLING_RUN', 'DASHBOARD_VIEW', 'REPORTS_VIEW', 'REPORTS_EXPORT', 'CALIBRATION_VIEW', 'CALIBRATION_MANAGE', 'CALIBRATION_PARTICIPATE', 'CALIBRATION_APPROVE_ANCHOR', 'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_CALIBRATION'] },
        { name: 'ADMIN', permissions: permissions.map(p => p.code) },
    ];

    for (const roleData of roles) {
        const role = await prisma.userRole.upsert({
            where: { name: roleData.name },
            update: {},
            create: { name: roleData.name, isSystem: true },
        });

        const perms = await prisma.permission.findMany({
            where: { code: { in: roleData.permissions } },
        });

        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
        for (const p of perms) {
            await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: p.id } });
        }
        console.log(`✅ Configured role: ${role.name}`);
    }

    // 3. Root Admin
    const adminEmail = 'admin@example.com';
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminRole = await prisma.userRole.findUnique({ where: { name: 'ADMIN' } });

    await prisma.user.upsert({
        where: { email: adminEmail },
        update: { password: hashedPassword, role: Role.ADMIN, roleId: adminRole.id, isActive: true },
        create: {
            email: adminEmail,
            name: 'System Administrator',
            password: hashedPassword,
            role: Role.ADMIN,
            roleId: adminRole.id,
            eid: 'ADMIN-001',
            systemId: 'ROOT-ADMIN',
            mustChangePassword: false
        }
    });

    console.log(`\n🚀 System Ready.`);
    console.log(`🔑 Admin Login: ${adminEmail} / password123`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
