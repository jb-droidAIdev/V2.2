
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ROLES = {
    ADMIN: 'ADMIN',
    SDM: 'SDM',
    OPS_MANAGER: 'OPS_MANAGER',
    OPS_TL: 'OPS_TL',
    QA_MANAGER: 'QA_MANAGER',
    QA_TL: 'QA_TL',
    QA: 'QA',
    AGENT: 'AGENT'
};

const PERMISSIONS = [
    // PAGE ACCESS
    { code: 'PAGE_DASHBOARD', module: 'PAGE', description: 'Access Dashboard' },
    { code: 'PAGE_DOSSIER', module: 'PAGE', description: 'Access Dossier' },
    { code: 'PAGE_FORMS', module: 'PAGE', description: 'Access Forms' },
    { code: 'PAGE_AUDITS', module: 'PAGE', description: 'Access Audits' },
    { code: 'PAGE_EVALUATE', module: 'PAGE', description: 'Access Evaluation' },
    { code: 'PAGE_CALIBRATION', module: 'PAGE', description: 'Access Calibration' },
    { code: 'PAGE_ADMIN', module: 'PAGE', description: 'Access Admin Settings' },

    // AUDIT
    { code: 'AUDIT_CREATE', module: 'AUDIT', description: 'Create new audits' },
    { code: 'AUDIT_VIEW_SELF', module: 'AUDIT', description: 'View own audits' },
    { code: 'AUDIT_VIEW_TEAM', module: 'AUDIT', description: 'View team audits' },
    { code: 'AUDIT_VIEW_ALL', module: 'AUDIT', description: 'View all audits' },
    { code: 'AUDIT_DELETE', module: 'AUDIT', description: 'Delete audits' },

    // DISPUTE
    { code: 'DISPUTE_CREATE', module: 'DISPUTE', description: 'Raise disputes' },
    { code: 'DISPUTE_view', module: 'DISPUTE', description: 'View disputes' }, // Note: view_self logic implied
    { code: 'DISPUTE_RESOLVE', module: 'DISPUTE', description: 'Resolve disputes (QA)' },
    { code: 'DISPUTE_REAPPEAL', module: 'DISPUTE', description: 'Re-appeal disputes' },
    { code: 'DISPUTE_FINAL_VERDICT', module: 'DISPUTE', description: 'Finalize disputes (TL)' },

    // FORM
    { code: 'FORM_CREATE', module: 'FORM', description: 'Create forms' },
    { code: 'FORM_EDIT', module: 'FORM', description: 'Edit forms' },
    { code: 'FORM_ARCHIVE', module: 'FORM', description: 'Archive forms' },

    // CALIBRATION
    { code: 'CALIBRATION_CREATE', module: 'CALIBRATION', description: 'Create sessions' },
    { code: 'CALIBRATION_VIEW', module: 'CALIBRATION', description: 'View sessions' },
    { code: 'CALIBRATION_MANAGE', module: 'CALIBRATION', description: 'Manage sessions' },
    { code: 'CALIBRATION_VALIDATE_ANCHOR', module: 'CALIBRATION', description: 'Validate anchors' },
    { code: 'CALIBRATION_SCORE', module: 'CALIBRATION', description: 'Participate in scoring' },

    // USER/SYSTEM
    { code: 'USER_MANAGE', module: 'SYSTEM', description: 'Manage users' },
    { code: 'CAMPAIGN_MANAGE', module: 'SYSTEM', description: 'Manage campaigns' },
    { code: 'RBAC_MANAGE', module: 'SYSTEM', description: 'Manage Roles and Permissions' }
];

const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: PERMISSIONS.map(p => p.code), // ALL
    [ROLES.QA_MANAGER]: [
        'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_FORMS', 'PAGE_AUDITS', 'PAGE_EVALUATE', 'PAGE_CALIBRATION',
        'AUDIT_CREATE', 'AUDIT_VIEW_ALL', 'AUDIT_DELETE',
        'DISPUTE_RESOLVE', 'DISPUTE_FINAL_VERDICT',
        'FORM_CREATE', 'FORM_EDIT', 'FORM_ARCHIVE',
        'CALIBRATION_CREATE', 'CALIBRATION_VIEW', 'CALIBRATION_MANAGE', 'CALIBRATION_VALIDATE_ANCHOR',
        'USER_MANAGE', 'CAMPAIGN_MANAGE'
    ],
    [ROLES.QA_TL]: [
        'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_FORMS', 'PAGE_AUDITS', 'PAGE_EVALUATE', 'PAGE_CALIBRATION',
        'AUDIT_CREATE', 'AUDIT_VIEW_TEAM', // Scope usually team or all?
        'DISPUTE_RESOLVE', 'DISPUTE_FINAL_VERDICT',
        'FORM_CREATE', 'FORM_EDIT',
        'CALIBRATION_CREATE', 'CALIBRATION_VIEW', 'CALIBRATION_MANAGE', 'CALIBRATION_VALIDATE_ANCHOR', 'CALIBRATION_SCORE',
        'USER_MANAGE'
    ],
    [ROLES.QA]: [
        'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_EVALUATE', 'PAGE_CALIBRATION',
        'AUDIT_CREATE', 'AUDIT_VIEW_SELF', // Actually usually view all or assigned
        'DISPUTE_RESOLVE',
        'CALIBRATION_CREATE', 'CALIBRATION_VIEW', 'CALIBRATION_MANAGE', 'CALIBRATION_VALIDATE_ANCHOR', 'CALIBRATION_SCORE'
    ],
    [ROLES.SDM]: [
        'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_CALIBRATION',
        'AUDIT_VIEW_TEAM',
        'DISPUTE_CREATE', 'DISPUTE_REAPPEAL',
        'CALIBRATION_VIEW', 'CALIBRATION_VALIDATE_ANCHOR',
        'USER_MANAGE' // Can usually manage their own team? Check existing logic.
    ],
    [ROLES.OPS_MANAGER]: [
        'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_CALIBRATION',
        'AUDIT_VIEW_TEAM',
        'DISPUTE_CREATE', 'DISPUTE_REAPPEAL',
        'CALIBRATION_VIEW', 'CALIBRATION_VALIDATE_ANCHOR'
    ],
    [ROLES.OPS_TL]: [
        'PAGE_DASHBOARD', 'PAGE_DOSSIER', 'PAGE_AUDITS', 'PAGE_CALIBRATION',
        'AUDIT_VIEW_TEAM',
        'DISPUTE_CREATE', 'DISPUTE_REAPPEAL',
        'CALIBRATION_VIEW'
    ],
    [ROLES.AGENT]: [
        'PAGE_DASHBOARD', 'PAGE_AUDITS',
        'AUDIT_VIEW_SELF',
        'DISPUTE_CREATE'
    ]
};

async function main() {
    console.log('Starting RBAC Seed...');

    // 1. Create Permissions
    for (const p of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { code: p.code },
            update: { description: p.description, module: p.module },
            create: p
        });
    }
    console.log('Permissions seeded.');

    // 2. Create Roles and assign permissions
    for (const [roleName, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
        const isSystem = true;
        const isAgent = roleName === 'AGENT';

        const role = await prisma.userRole.upsert({
            where: { name: roleName },
            update: { isSystem, isAgent },
            create: { name: roleName, isSystem, isAgent }
        });

        // Sync permissions
        // First remove existing
        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

        // Add new
        for (const code of permissionCodes) {
            const perm = await prisma.permission.findUnique({ where: { code } });
            if (perm) {
                await prisma.rolePermission.create({
                    data: {
                        roleId: role.id,
                        permissionId: perm.id
                    }
                });
            }
        }
    }
    console.log('Roles seeded.');

    // 3. Migrate Users
    // Find all users who have an enum Role but no roleId
    const users = await prisma.user.findMany({
        where: { roleId: null }
    });

    console.log(`Found ${users.length} users to migrate.`);

    for (const user of users) {
        if (user.role) {
            const targetRole = await prisma.userRole.findUnique({ where: { name: user.role } });
            if (targetRole) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { roleId: targetRole.id }
                });
            }
        }
    }

    // Explicit Admin Fix (just in case)
    const adminRole = await prisma.userRole.findUnique({ where: { name: 'ADMIN' } });
    if (adminRole) {
        await prisma.user.updateMany({
            where: { email: 'admin@qms.local' },
            data: { roleId: adminRole.id }
        });
    }

    console.log('RBAC Migration Complete.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
