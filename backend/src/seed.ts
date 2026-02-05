import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            name: 'Admin User',
            password: hashedPassword,
            role: Role.ADMIN,
            eid: 'E00001',
            systemId: 'ADMIN-01',
            employeeTeam: 'Management',
            projectCode: 'CORE',
            supervisor: 'Executive',
            manager: 'Board',
            sdm: 'System'
        },
    });

    // Add some Agents
    const agentData = [
        { name: 'John Doe', eid: 'E10001', systemId: 'AGT-101', role: Role.AGENT, team: 'Alpha', project: 'SUPPORT' },
        { name: 'Alice Smith', eid: 'E10002', systemId: 'AGT-102', role: Role.AGENT, team: 'Beta', project: 'SALES' },
        { name: 'Michael Brown', eid: 'E10003', systemId: 'AGT-103', role: Role.QA, team: 'Quality', project: 'QA' },
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

    // Create a Sample Campaign
    const campaign = await prisma.campaign.upsert({
        where: { id: 'sample-campaign-id' },
        update: {},
        create: {
            id: 'sample-campaign-id',
            name: 'Customer Support Quality',
            samplingRate: 10.0
        }
    });

    // Create a Monitoring Form
    const form = await prisma.monitoringForm.upsert({
        where: { id: 'sample-form-id' },
        update: {},
        create: {
            id: 'sample-form-id',
            campaignId: campaign.id,
            teamName: 'Alpha',
            name: 'Standard Support Rubric',
            description: 'Standard evaluation form'
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

    console.log('Seeding completed with sample audit data.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
