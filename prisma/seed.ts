import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding system permissions and primary admin...');

    // 1. Master Permissions List
    const permissions = [
        { code: 'PAGE_DASHBOARD', module: 'Page Access', description: 'Grants access to the Dashboard module.' },
        { code: 'DASHBOARD_VIEW', module: 'System', description: 'Grants ability to view advanced dashboard metrics.' },
        { code: 'PAGE_DOSSIER', module: 'Page Access', description: 'Grants access to the Dossier module.' },
        { code: 'PAGE_AUDITS', module: 'Page Access', description: 'Grants access to the Audits module.' },
        { code: 'PAGE_EVALUATE', module: 'Page Access', description: 'Grants access to the Evaluation module.' },
        { code: 'PAGE_CALIBRATION', module: 'Page Access', description: 'Grants access to the Calibration module.' },
        { code: 'PAGE_FORMS', module: 'Page Access', description: 'Grants access to the Forms module.' },
        { code: 'PAGE_ADMIN', module: 'Page Access', description: 'Grants access to the Admin module.' },
        { code: 'USER_MANAGE', module: 'System', description: 'Grants ability to manage system users.' },
        { code: 'CAMPAIGN_MANAGE', module: 'System', description: 'Grants ability to manage configurations, folder grouping, and ZTP thresholds.' },
        { code: '*', module: 'System', description: 'Grants unlimited Super Admin wildcard access.' },
        { code: 'AUDIT_CREATE', module: 'Audit', description: 'Grants ability to create and conduct quality audits.' },
        { code: 'AUDIT_VIEW_ALL', module: 'Audit', description: 'Grants ability to view all audits across the system.' },
        { code: 'AUDIT_VIEW_TEAM', module: 'Audit', description: 'Grants ability to view audits for assigned teams/campaigns.' },
        { code: 'AUDIT_VIEW_OWN', module: 'Audit', description: 'Grants ability for an agent to view their own audits.' },
        { code: 'AUDIT_ACKNOWLEDGE', module: 'Audit', description: 'Grants ability to acknowledge completed audits.' },
        { code: 'AUDIT_DELETE', module: 'Audit', description: 'Grants ability to permanently delete audit records.' },
        { code: 'AUDIT_COACH', module: 'Audit', description: 'Grants ability to conduct and release coaching logs.' },
        { code: 'AUDIT_IMPORT_LEGACY', module: 'Audit', description: 'Grants the ability to bulk import historical legacy audits from spreadsheets.' },
        { code: 'COACHING_LOG_READ', module: 'Audit', description: 'Grants view-only access to coaching logs without editing capabilities.' },
        { code: 'DISPUTE_CREATE', module: 'Dispute', description: 'Grants ability to file a dispute against an audit.' },
        { code: 'DISPUTE_RESOLVE', module: 'Dispute', description: 'Grants ability to provide QA verdict on disputes.' },
        { code: 'DISPUTE_REAPPEAL', module: 'Dispute', description: 'Grants ability to file a re-appeal on QA verdicts.' },
        { code: 'DISPUTE_FINAL_VERDICT', module: 'Dispute', description: 'Grants ability to provide the final verdict on disputes.' },
        { code: 'CALIBRATION_VIEW', module: 'Calibration', description: 'Grants ability to view calibration sessions.' },
        { code: 'CALIBRATION_CREATE', module: 'Calibration', description: 'Grants ability to create new calibration sessions.' },
        { code: 'CALIBRATION_MANAGE', module: 'Calibration', description: 'Grants ability to manage active calibration sessions.' },
        { code: 'CALIBRATION_SCORE', module: 'Calibration', description: 'Grants ability to participate and score in calibrations.' },
        { code: 'CALIBRATION_VALIDATE_ANCHOR', module: 'Calibration', description: 'Grants ability to validate calibration anchor scores.' },
        { code: 'FORM_CREATE', module: 'Forms', description: 'Grants ability to create new monitoring forms.' },
        { code: 'FORM_PUBLISH', module: 'Forms', description: 'Grants ability to publish monitoring forms.' },
        { code: 'FORM_ARCHIVE', module: 'Forms', description: 'Grants ability to archive monitoring forms.' },
        { code: 'FORM_DELETE', module: 'Forms', description: 'Grants ability to delete monitoring forms.' },
        { code: 'FORM_DUPLICATE', module: 'Forms', description: 'Grants ability to duplicate monitoring forms.' },
    ];

    for (const p of permissions) {
        await prisma.permission.upsert({
            where: { code: p.code },
            update: { description: p.description, module: p.module },
            create: p,
        });
    }

    // 2. Roles Initialization
    const roles = [
        { name: 'ADMIN', description: 'System Administrator', isSystem: true },
        { name: 'QA_MANAGER', description: 'QA Manager', isSystem: true },
        { name: 'QA_TL', description: 'QA Team Leader', isSystem: true },
        { name: 'QA', description: 'Quality Analyst', isSystem: true },
        { name: 'OPS_MANAGER', description: 'Operations Manager', isSystem: true },
        { name: 'OPS_TL', description: 'Operations Team Lead', isSystem: true },
        { name: 'SDM', description: 'Service Delivery Manager', isSystem: true },
        { name: 'AGENT', description: 'Customer Service Representative', isSystem: true },
    ];

    for (const r of roles) {
        await prisma.userRole.upsert({
            where: { name: r.name },
            update: { description: r.description },
            create: r,
        });
    }

    const adminRole = await prisma.userRole.findUnique({ where: { name: 'ADMIN' } });
    if (adminRole) {
        const allPermissions = await prisma.permission.findMany();
        for (const p of allPermissions) {
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId: adminRole.id,
                        permissionId: p.id,
                    },
                },
                update: {},
                create: {
                    roleId: adminRole.id,
                    permissionId: p.id,
                },
            });
        }
    }

    // 3. Admin User - admin@example.com / password123
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            roleId: adminRole?.id,
            isActive: true
        },
        create: {
            email: 'admin@example.com',
            name: 'System Admin',
            password: hashedPassword,
            role: 'ADMIN',
            roleId: adminRole?.id,
            isActive: true,
            mustChangePassword: false,
            eid: 'ADMIN001',
            systemId: 'SYS_ADMIN_001'
        },
    });

    console.log('✅ Seeding complete!');
    console.log('Primary Admin: admin@example.com / password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
