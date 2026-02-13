import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seed...\n');

  // ==================== RBAC SEEDING ====================
  console.log('📝 Step 1: Creating permissions...');

  // Define all permissions (both action-based and page-based for frontend/backend compatibility)
  const permissions = [
    // User Management
    { code: 'USER_VIEW', description: 'View users', module: 'Users' },
    { code: 'USER_MANAGE', description: 'Create, update, and delete users', module: 'Users' },

    // Campaign Management
    { code: 'CAMPAIGN_VIEW', description: 'View campaigns', module: 'Campaigns' },
    { code: 'CAMPAIGN_MANAGE', description: 'Create, update, and delete campaigns', module: 'Campaigns' },

    // Form Management
    { code: 'FORM_VIEW', description: 'View monitoring forms', module: 'Forms' },
    { code: 'FORM_MANAGE', description: 'Create, update, and delete forms', module: 'Forms' },
    { code: 'FORM_PUBLISH', description: 'Publish form versions', module: 'Forms' },

    // Audit Management
    { code: 'AUDIT_VIEW', description: 'View audits', module: 'Audits' },
    { code: 'AUDIT_CREATE', description: 'Create and conduct audits', module: 'Audits' },
    { code: 'AUDIT_RELEASE', description: 'Release audits to agents', module: 'Audits' },
    { code: 'AUDIT_VIEW_ALL', description: 'View all audits across campaigns', module: 'Audits' },

    // Dispute Management
    { code: 'DISPUTE_VIEW', description: 'View disputes', module: 'Disputes' },
    { code: 'DISPUTE_CREATE', description: 'Create disputes', module: 'Disputes' },
    { code: 'DISPUTE_REVIEW', description: 'Review and resolve disputes', module: 'Disputes' },

    // Calibration Management
    { code: 'CALIBRATION_VIEW', description: 'View calibration sessions', module: 'Calibration' },
    { code: 'CALIBRATION_MANAGE', description: 'Create and manage calibration sessions', module: 'Calibration' },
    { code: 'CALIBRATION_PARTICIPATE', description: 'Participate in calibration sessions', module: 'Calibration' },
    { code: 'CALIBRATION_APPROVE_ANCHOR', description: 'Approve calibration anchors', module: 'Calibration' },

    // Ticket Management
    { code: 'TICKET_UPLOAD', description: 'Upload ticket batches', module: 'Tickets' },
    { code: 'TICKET_VIEW', description: 'View tickets', module: 'Tickets' },

    // Sampling
    { code: 'SAMPLING_RUN', description: 'Run sampling operations', module: 'Sampling' },

    // Dashboard & Reports
    { code: 'DASHBOARD_VIEW', description: 'View dashboard and analytics', module: 'Dashboard' },
    { code: 'REPORTS_VIEW', description: 'View reports', module: 'Reports' },
    { code: 'REPORTS_EXPORT', description: 'Export reports', module: 'Reports' },

    // System Administration
    { code: 'SYSTEM_ADMIN', description: 'Full system administration access', module: 'System' },

    // Page Access Permissions (Frontend Navigation)
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
  console.log(`✅ Created ${permissions.length} permissions\n`);

  // Define roles with their permissions
  console.log('👥 Step 2: Creating roles and assigning permissions...');

  const roles = [
    {
      name: 'AGENT',
      description: 'Front-line agent with basic access',
      isSystem: true,
      permissions: [
        'AUDIT_VIEW',
        'DISPUTE_CREATE',
        'DISPUTE_VIEW',
        'DASHBOARD_VIEW',
        'PAGE_DASHBOARD',
        'PAGE_AUDITS',
      ],
    },
    {
      name: 'QA',
      description: 'Quality Analyst - conducts audits',
      isSystem: true,
      permissions: [
        'AUDIT_VIEW',
        'AUDIT_CREATE',
        'AUDIT_RELEASE',
        'DISPUTE_VIEW',
        'DISPUTE_REVIEW',
        'FORM_VIEW',
        'CAMPAIGN_VIEW',
        'TICKET_VIEW',
        'DASHBOARD_VIEW',
        'REPORTS_VIEW',
        'CALIBRATION_VIEW',
        'CALIBRATION_PARTICIPATE',
        'PAGE_DASHBOARD',
        'PAGE_AUDITS',
        'PAGE_EVALUATE',
        'PAGE_FORMS',
        'PAGE_CALIBRATION',
      ],
    },
    {
      name: 'QA_TL',
      description: 'QA Team Lead - manages QA team',
      isSystem: true,
      permissions: [
        'AUDIT_VIEW',
        'AUDIT_CREATE',
        'AUDIT_RELEASE',
        'AUDIT_VIEW_ALL',
        'DISPUTE_VIEW',
        'DISPUTE_REVIEW',
        'FORM_VIEW',
        'FORM_MANAGE',
        'CAMPAIGN_VIEW',
        'TICKET_VIEW',
        'TICKET_UPLOAD',
        'SAMPLING_RUN',
        'DASHBOARD_VIEW',
        'REPORTS_VIEW',
        'REPORTS_EXPORT',
        'CALIBRATION_VIEW',
        'CALIBRATION_MANAGE',
        'CALIBRATION_PARTICIPATE',
        'CALIBRATION_APPROVE_ANCHOR',
        'PAGE_DASHBOARD',
        'PAGE_DOSSIER',
        'PAGE_AUDITS',
        'PAGE_EVALUATE',
        'PAGE_FORMS',
        'PAGE_CALIBRATION',
      ],
    },
    {
      name: 'OPS_TL',
      description: 'Operations Team Lead',
      isSystem: true,
      permissions: [
        'USER_VIEW',
        'AUDIT_VIEW',
        'AUDIT_VIEW_ALL',
        'DISPUTE_VIEW',
        'CAMPAIGN_VIEW',
        'FORM_VIEW',
        'TICKET_VIEW',
        'DASHBOARD_VIEW',
        'REPORTS_VIEW',
        'REPORTS_EXPORT',
        'CALIBRATION_VIEW',
        'CALIBRATION_APPROVE_ANCHOR',
        'PAGE_DASHBOARD',
        'PAGE_DOSSIER',
        'PAGE_AUDITS',
        'PAGE_CALIBRATION',
      ],
    },
    {
      name: 'QA_MANAGER',
      description: 'QA Manager - oversees quality operations',
      isSystem: true,
      permissions: [
        'USER_VIEW',
        'USER_MANAGE',
        'AUDIT_VIEW',
        'AUDIT_CREATE',
        'AUDIT_RELEASE',
        'AUDIT_VIEW_ALL',
        'DISPUTE_VIEW',
        'DISPUTE_REVIEW',
        'FORM_VIEW',
        'FORM_MANAGE',
        'FORM_PUBLISH',
        'CAMPAIGN_VIEW',
        'CAMPAIGN_MANAGE',
        'TICKET_VIEW',
        'TICKET_UPLOAD',
        'SAMPLING_RUN',
        'DASHBOARD_VIEW',
        'REPORTS_VIEW',
        'REPORTS_EXPORT',
        'CALIBRATION_VIEW',
        'CALIBRATION_MANAGE',
        'CALIBRATION_PARTICIPATE',
        'CALIBRATION_APPROVE_ANCHOR',
        'PAGE_DASHBOARD',
        'PAGE_DOSSIER',
        'PAGE_AUDITS',
        'PAGE_EVALUATE',
        'PAGE_FORMS',
        'PAGE_CALIBRATION',
      ],
    },
    {
      name: 'OPS_MANAGER',
      description: 'Operations Manager',
      isSystem: true,
      permissions: [
        'USER_VIEW',
        'USER_MANAGE',
        'AUDIT_VIEW',
        'AUDIT_VIEW_ALL',
        'DISPUTE_VIEW',
        'CAMPAIGN_VIEW',
        'CAMPAIGN_MANAGE',
        'FORM_VIEW',
        'TICKET_VIEW',
        'DASHBOARD_VIEW',
        'REPORTS_VIEW',
        'REPORTS_EXPORT',
        'CALIBRATION_VIEW',
        'CALIBRATION_APPROVE_ANCHOR',
        'PAGE_DASHBOARD',
        'PAGE_DOSSIER',
        'PAGE_AUDITS',
      ],
    },
    {
      name: 'SDM',
      description: 'Service Delivery Manager - full operational control',
      isSystem: true,
      permissions: [
        'USER_VIEW',
        'USER_MANAGE',
        'AUDIT_VIEW',
        'AUDIT_CREATE',
        'AUDIT_RELEASE',
        'AUDIT_VIEW_ALL',
        'DISPUTE_VIEW',
        'DISPUTE_REVIEW',
        'FORM_VIEW',
        'FORM_MANAGE',
        'FORM_PUBLISH',
        'CAMPAIGN_VIEW',
        'CAMPAIGN_MANAGE',
        'TICKET_VIEW',
        'TICKET_UPLOAD',
        'SAMPLING_RUN',
        'DASHBOARD_VIEW',
        'REPORTS_VIEW',
        'REPORTS_EXPORT',
        'CALIBRATION_VIEW',
        'CALIBRATION_MANAGE',
        'CALIBRATION_PARTICIPATE',
        'CALIBRATION_APPROVE_ANCHOR',
        'PAGE_DASHBOARD',
        'PAGE_DOSSIER',
        'PAGE_AUDITS',
        'PAGE_CALIBRATION',
      ],
    },
    {
      name: 'ADMIN',
      description: 'System Administrator - full system access',
      isSystem: true,
      permissions: permissions.map(p => p.code), // All permissions
    },
  ];

  for (const roleData of roles) {
    const { permissions: permCodes, ...roleInfo } = roleData;

    // Create or update role
    const role = await prisma.userRole.upsert({
      where: { name: roleInfo.name },
      update: {},
      create: roleInfo,
    });

    // Get permission IDs
    const perms = await prisma.permission.findMany({
      where: { code: { in: permCodes } },
    });

    // Delete existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Create new role permissions
    for (const perm of perms) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }

    console.log(`✅ Created role: ${role.name} with ${perms.length} permissions`);
  }

  // ==================== SAMPLE DATA SEEDING ====================
  console.log('\n📊 Step 3: Creating sample users and data...');

  const email = 'admin@example.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Get the ADMIN UserRole
  const adminUserRole = await prisma.userRole.findUnique({
    where: { name: 'ADMIN' }
  });

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Admin User',
      password: hashedPassword,
      role: Role.ADMIN,
      roleId: adminUserRole?.id, // Assign to ADMIN UserRole
      eid: 'E00001',
      systemId: 'ADMIN-01',
      employeeTeam: 'Management',
      projectCode: 'CORE',
      supervisor: 'Executive',
      manager: 'Board',
      sdm: 'System',
      mustChangePassword: false, // Admin doesn't need to change password
    },
  });
  console.log('✅ Created admin user');

  // Add some sample Agents
  const agentUserRole = await prisma.userRole.findUnique({
    where: { name: 'AGENT' }
  });
  const qaUserRole = await prisma.userRole.findUnique({
    where: { name: 'QA' }
  });

  const agentData = [
    { name: 'John Doe', eid: 'E10001', systemId: 'AGT-101', role: Role.AGENT, roleId: agentUserRole?.id, team: 'Alpha', project: 'SUPPORT' },
    { name: 'Alice Smith', eid: 'E10002', systemId: 'AGT-102', role: Role.AGENT, roleId: agentUserRole?.id, team: 'Beta', project: 'SALES' },
    { name: 'Michael Brown', eid: 'E10003', systemId: 'AGT-103', role: Role.QA, roleId: qaUserRole?.id, team: 'Quality', project: 'QA' },
  ];

  for (const data of agentData) {
    await prisma.user.upsert({
      where: { email: `${data.name.toLowerCase().replace(' ', '.')}@example.com` },
      update: {},
      create: {
        email: `${data.name.toLowerCase().replace(' ', '.')}@example.com`,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        roleId: data.roleId,
        eid: data.eid,
        systemId: data.systemId,
        employeeTeam: data.team,
        projectCode: data.project,
        supervisor: 'Jane Supervisor',
        manager: 'Robert Manager',
        sdm: 'Sarah SDM'
      }
    });
  }
  console.log('✅ Created sample users');

  // Create a Sample Campaign (explicitly set type to USER for evaluation)
  const campaign = await prisma.campaign.upsert({
    where: { id: 'sample-campaign-id' },
    update: {},
    create: {
      id: 'sample-campaign-id',
      name: 'Customer Support Quality',
      type: 'USER', // Explicitly set to USER type for evaluation
      samplingRate: 10.0
    }
  });
  console.log('✅ Created sample campaign');

  // Create a Monitoring Form with teamName matching campaign for evaluation
  const form = await prisma.monitoringForm.upsert({
    where: { id: 'sample-form-id' },
    update: {},
    create: {
      id: 'sample-form-id',
      campaignId: campaign.id,
      teamName: 'Customer Support Quality', // Match campaign name for team-based lookup
      name: 'Standard Support Rubric',
      description: 'Standard evaluation form for quality assessment',
      isArchived: false
    }
  });

  const formVersion = await prisma.monitoringFormVersion.create({
    data: {
      formId: form.id,
      versionNumber: 1,
      isActive: true,
      isDraft: false,
      categories: []
    }
  });
  console.log('✅ Created sample form');

  // Create a Batch and Ticket
  const batch = await prisma.ticketUploadBatch.create({
    data: {
      campaignId: campaign.id,
      uploadedBy: admin.id,
      filename: 'audit_test.csv',
      isProcessed: true
    }
  });

  const ticket = await prisma.uploadedTicket.create({
    data: {
      batchId: batch.id,
      campaignId: campaign.id,
      externalTicketId: 'TKT-999-XYZ',
      agentId: (await prisma.user.findFirst({ where: { role: Role.AGENT } }))?.id || admin.id,
      interactionDate: new Date(),
    }
  });

  const run = await prisma.samplingRun.create({
    data: {
      campaignId: campaign.id,
      batchId: batch.id,
      configUsed: {}
    }
  });

  const sampled = await prisma.sampledTicket.create({
    data: {
      ticketId: ticket.id,
      runId: run.id,
      assignedQaId: admin.id,
      status: 'COMPLETED'
    }
  });

  // Create a Sample Audit
  await prisma.audit.upsert({
    where: { sampledTicketId: sampled.id },
    update: {},
    create: {
      campaignId: campaign.id,
      sampledTicketId: sampled.id,
      formVersionId: formVersion.id,
      auditorId: admin.id,
      agentId: ticket.agentId,
      status: 'SUBMITTED',
      score: 85.5,
      submittedAt: new Date()
    }
  });
  console.log('✅ Created sample audit data');

  console.log('\n🎉 Comprehensive seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
