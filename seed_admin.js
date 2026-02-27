const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function main() {
    console.log('Seeding system permissions and admin user...');

    // 1. Create Master Permissions — one per distinct action in the app
    const permissions = [

        // ─── Page Access ───────────────────────────────────────────────────────
        {
            code: 'PAGE_DASHBOARD',
            module: 'Page Access',
            description: 'Grants access to the main Dashboard page, including real-time performance metrics, team scorecards, and fail-reason breakdowns.'
        },
        {
            code: 'DASHBOARD_VIEW',
            module: 'System',
            description: 'Allows viewing high-level performance cards (Total Audits, Avg Score, Compliance) on the dashboard.'
        },
        {
            code: 'PAGE_DOSSIER',
            module: 'Page Access',
            description: 'Grants access to the Dossier (User Management) page where employees can be viewed, added, edited, and assigned to campaigns or groups.'
        },
        {
            code: 'PAGE_AUDITS',
            module: 'Page Access',
            description: 'Grants access to the Audits page where quality audit records can be browsed, filtered, and reviewed in detail.'
        },
        {
            code: 'PAGE_EVALUATE',
            module: 'Page Access',
            description: 'Grants access to the Evaluation page used to conduct and submit live quality audit assessments against active scorecards.'
        },
        {
            code: 'PAGE_CALIBRATION',
            module: 'Page Access',
            description: 'Grants access to the Calibration Engine where team leaders and QA staff can align scoring standards and resolve scoring discrepancies.'
        },
        {
            code: 'PAGE_FORMS',
            module: 'Page Access',
            description: 'Grants access to the Scorecard Forms page where audit templates can be created, duplicated, published, archived, and managed.'
        },
        {
            code: 'PAGE_ADMIN',
            module: 'Page Access',
            description: 'Grants access to the Admin Console, which contains system-wide configuration tools, access control management, and platform settings.'
        },

        // ─── System ────────────────────────────────────────────────────────────
        {
            code: 'USER_MANAGE',
            module: 'System',
            description: 'Allows creating, editing, and deactivating user accounts, assigning roles, managing team groups, and configuring campaign access per employee.'
        },
        {
            code: 'CAMPAIGN_MANAGE',
            module: 'System',
            description: 'Allows creating, editing, and archiving campaigns (projects). Controls which teams and scorecards are associated with each campaign.'
        },
        {
            code: '*',
            module: 'System',
            description: 'Wildcard — grants unrestricted access to all current and future features of the platform. Reserved exclusively for System Administrators.'
        },

        // ─── Audit ─────────────────────────────────────────────────────────────
        {
            code: 'AUDIT_CREATE',
            module: 'Audit',
            description: 'Allows submitting new quality audits for agents. This includes selecting the agent, campaign, and scorecard, then scoring each criterion.'
        },
        {
            code: 'AUDIT_VIEW_ALL',
            module: 'Audit',
            description: 'Allows viewing audit records for all agents and teams — not just those under the user\'s direct supervision or campaign scope.'
        },
        {
            code: 'AUDIT_VIEW_TEAM',
            module: 'Audit',
            description: 'Allows viewing audit records for all agents within the user\'s assigned campaigns (for QAs) or the user\'s owned team (for Supervisors).'
        },
        {
            code: 'AUDIT_VIEW_OWN',
            module: 'Audit',
            description: 'Allows agents to view only their own audit results once they have been released by the QA team.'
        },
        {
            code: 'AUDIT_ACKNOWLEDGE',
            module: 'Audit',
            description: 'Allows an agent or their supervisor to formally acknowledge (sign off on) a completed audit result, confirming the score has been reviewed.'
        },
        {
            code: 'AUDIT_DELETE',
            module: 'Audit',
            description: 'Allows permanently deleting an audit record from the system. This is a destructive action and should be restricted to senior administrators only.'
        },

        // ─── Dispute ───────────────────────────────────────────────────────────
        {
            code: 'DISPUTE_CREATE',
            module: 'Dispute',
            description: 'Allows supervisors or team leaders to file a formal dispute against a submitted audit result, providing a reason and requesting a QA review.'
        },
        {
            code: 'DISPUTE_RESOLVE',
            module: 'Dispute',
            description: 'Allows QA staff to review and issue a verdict (accept or reject) on a submitted dispute. The verdict may trigger a score recalculation.'
        },
        {
            code: 'DISPUTE_REAPPEAL',
            module: 'Dispute',
            description: 'Allows supervisors or team leaders to re-appeal a rejected dispute verdict, escalating the case to the QA Team Leader for a final decision.'
        },
        {
            code: 'DISPUTE_FINAL_VERDICT',
            module: 'Dispute',
            description: 'Allows QA Team Leaders to issue the final, binding verdict on a re-appealed dispute. This closes the dispute workflow permanently.'
        },

        // ─── Calibration ───────────────────────────────────────────────────────
        {
            code: 'CALIBRATION_VIEW',
            module: 'Calibration',
            description: 'Allows viewing calibration sessions, their scores, results, and reproducibility/repeatability statistics. Does not permit creating or modifying sessions.'
        },
        {
            code: 'CALIBRATION_CREATE',
            module: 'Calibration',
            description: 'Allows creating new calibration sessions, defining the scope, campaign, participants, and scheduling the session date.'
        },
        {
            code: 'CALIBRATION_MANAGE',
            module: 'Calibration',
            description: 'Allows updating, deleting, and managing calibration sessions — including randomizing tickets, triggering score calculations, and closing sessions.'
        },
        {
            code: 'CALIBRATION_SCORE',
            module: 'Calibration',
            description: 'Allows participants to submit their calibration scores for assigned tickets during an active calibration session.'
        },
        {
            code: 'CALIBRATION_VALIDATE_ANCHOR',
            module: 'Calibration',
            description: 'Allows designated anchors (usually QA leads) to approve or reject the reference scoring anchor before calibration scoring begins.'
        },

        // ─── Forms ─────────────────────────────────────────────────────────────
        {
            code: 'FORM_CREATE',
            module: 'Forms',
            description: 'Allows creating new scorecard forms and saving them as drafts, ready to be built out in the Form Builder.'
        },
        {
            code: 'FORM_PUBLISH',
            module: 'Forms',
            description: 'Allows publishing a scorecard version, making it the active template used for audits in the assigned campaign.'
        },
        {
            code: 'FORM_ARCHIVE',
            module: 'Forms',
            description: 'Allows archiving a scorecard form, removing it from active use without permanently deleting it. Archived forms can still be viewed historically.'
        },
        {
            code: 'FORM_DELETE',
            module: 'Forms',
            description: 'Allows permanently deleting a scorecard form and all its versions from the system. This is irreversible and should be restricted to administrators.'
        },
        {
            code: 'FORM_DUPLICATE',
            module: 'Forms',
            description: 'Allows duplicating an existing scorecard form as a starting point for a new one, copying its structure, criteria, and weights.'
        },
    ];

    for (const p of permissions) {
        await prisma.permission.upsert({
            where: { code: p.code },
            update: { description: p.description, module: p.module },
            create: p,
        });
    }

    console.log(`✓ ${permissions.length} permissions upserted`);

    // 2. Create ADMIN Role
    const adminRole = await prisma.userRole.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: {
            name: 'ADMIN',
            description: 'System Administrator',
            isSystem: true,
        },
    });

    // 3. Link all permissions to ADMIN role
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

    console.log(`✓ All ${allPermissions.length} permissions linked to ADMIN role`);

    // 4. Create default Admin User
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    await prisma.user.upsert({
        where: { email: 'admin@flatworld.ph' },
        update: {
            role: 'ADMIN',
            roleId: adminRole.id,
            isActive: true
        },
        create: {
            email: 'admin@flatworld.ph',
            name: 'System Admin',
            password: hashedPassword,
            role: 'ADMIN',
            roleId: adminRole.id,
            isActive: true,
            mustChangePassword: false,
        },
    });

    console.log('✓ Admin user ready: admin@flatworld.ph / Admin@123');

    // 5. Update other roles with new defaults
    const qaRole = await prisma.userRole.findUnique({ where: { name: 'QA' } });
    if (qaRole) {
        const viewAllPerm = await prisma.permission.findUnique({ where: { code: 'AUDIT_VIEW_ALL' } });
        const viewTeamPerm = await prisma.permission.findUnique({ where: { code: 'AUDIT_VIEW_TEAM' } });
        if (viewAllPerm) await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: qaRole.id, permissionId: viewAllPerm.id } },
            update: {}, create: { roleId: qaRole.id, permissionId: viewAllPerm.id }
        });
        if (viewTeamPerm) await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: qaRole.id, permissionId: viewTeamPerm.id } },
            update: {}, create: { roleId: qaRole.id, permissionId: viewTeamPerm.id }
        });
    }

    const agentRole = await prisma.userRole.findUnique({ where: { name: 'AGENT' } });
    if (agentRole) {
        const viewOwnPerm = await prisma.permission.findUnique({ where: { code: 'AUDIT_VIEW_OWN' } });
        if (viewOwnPerm) await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: agentRole.id, permissionId: viewOwnPerm.id } },
            update: {}, create: { roleId: agentRole.id, permissionId: viewOwnPerm.id }
        });
    }

    console.log('\nSeeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
