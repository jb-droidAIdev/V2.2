import { PrismaClient, AuditStatus, CampaignType } from '@prisma/client';
import { hash } from 'bcrypt';
import { subDays, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting COPC Dummy Data Seeding...');

    const passwordHash = await hash('password123', 10);

    // 1. Create Users
    const qaExpert = await prisma.user.upsert({
        where: { email: 'qa_expert@example.com' },
        update: {},
        create: {
            email: 'qa_expert@example.com',
            name: 'QA Expert Admin',
            role: 'QA',
            password: passwordHash,
            eid: 'COPC_QA001',
            systemId: 'SYS_COPC_QA_001',
            isActive: true,
            mustChangePassword: false
        }
    });

    const agents = await Promise.all([
        prisma.user.upsert({
            where: { email: 'agent_silver@example.com' },
            update: {},
            create: {
                email: 'agent_silver@example.com',
                name: 'Silver Agent',
                role: 'AGENT',
                password: passwordHash,
                eid: 'AG001',
                systemId: 'SYS_AG_001',
                isActive: true,
                mustChangePassword: false,
                employeeTeam: 'Frontline Alpha'
            }
        }),
        prisma.user.upsert({
            where: { email: 'agent_gold@example.com' },
            update: {},
            create: {
                email: 'agent_gold@example.com',
                name: 'Gold Agent',
                role: 'AGENT',
                password: passwordHash,
                eid: 'AG002',
                systemId: 'SYS_AG_002',
                isActive: true,
                mustChangePassword: false,
                employeeTeam: 'Frontline Beta'
            }
        })
    ]);

    // 2. Create Campaign
    const campaign = await prisma.campaign.create({
        data: {
            name: 'Customer Experience 2026',
            projectCode: 'CX-2026',
            type: CampaignType.USER,
            isActive: true,
            samplingRate: 10.0
        }
    });

    // 3. Create Monitoring Form
    const form = await prisma.monitoringForm.create({
        data: {
            name: 'COPC Quality Framework v1.0',
            description: 'Standardized assessment based on COPC Customer Experience standards.',
            campaignId: campaign.id,
            isConfigured: true,
            teamName: 'Frontline Alpha'
        }
    });

    // 4. Create Form Version with Criteria
    const categories = [
        {
            id: 'cat_accuracy',
            name: 'Accuracy & Compliance',
            weight: 30,
            criteria: [
                { title: 'Information Accuracy', description: 'Correctness of data provided to customer', weight: 15, isCritical: true },
                { title: 'Procedure Compliance', description: 'Following standard operating procedures', weight: 15, isCritical: false }
            ]
        },
        {
            id: 'cat_cx',
            name: 'Customer Experience',
            weight: 40,
            criteria: [
                { title: 'Empathy & Rapport', description: 'Building connection with customer', weight: 15, isCritical: false },
                { title: 'Professionalism', description: 'Tone and language used', weight: 15, isCritical: false },
                { title: 'Active Listening', description: 'Understanding customer needs', weight: 10, isCritical: false }
            ]
        },
        {
            id: 'cat_efficiency',
            name: 'Efficiency',
            weight: 30,
            criteria: [
                { title: 'FCR Potential', description: 'Did the agent aim for First Contact Resolution?', weight: 20, isCritical: false },
                { title: 'Hold & Transfer Etiquette', description: 'Correct handle of hold/transfer', weight: 10, isCritical: false }
            ]
        }
    ];

    const formVersion = await prisma.monitoringFormVersion.create({
        data: {
            formId: form.id,
            versionNumber: 1,
            isActive: true,
            isDraft: false,
            categories: categories as any,
            creatorId: qaExpert.id,
            changeLog: 'Initial COPC Framework implementation'
        }
    });

    // Create individual criteria records for scoring
    const criteriaRecords: any[] = [];
    for (const cat of categories) {
        for (const crit of cat.criteria) {
            const c = await prisma.formCriterion.create({
                data: {
                    formVersionId: formVersion.id,
                    categoryId: cat.id,
                    categoryName: cat.name,
                    title: crit.title,
                    description: crit.description,
                    weight: crit.weight,
                    isCritical: crit.isCritical
                }
            });
            criteriaRecords.push({ ...c, categoryWeight: cat.weight });
        }
    }

    // 5. Create Audits over the last 15 days
    console.log('📊 Creating historical audits for trend analysis...');

    for (let i = 15; i >= 0; i--) {
        const auditDate = subDays(new Date(), i);

        for (const agent of agents) {
            // Generate a score with some variation (70-100 range)
            const baseScore = 70 + Math.random() * 30;
            const finalScore = parseFloat(baseScore.toFixed(2));

            const audit = await prisma.audit.create({
                data: {
                    campaignId: campaign.id,
                    formVersionId: formVersion.id,
                    auditorId: qaExpert.id,
                    agentId: agent.id,
                    status: AuditStatus.RELEASED,
                    score: finalScore,
                    startedAt: setHours(setMinutes(auditDate, Math.random() * 60), 10),
                    submittedAt: setHours(setMinutes(auditDate, Math.random() * 60), 11),
                    releasedAt: setHours(setMinutes(auditDate, Math.random() * 60), 12),
                    ticketReference: `TKT-${2026000 + i}-${agent.eid}`
                }
            });

            // Create scores for each criterion
            for (const crit of criteriaRecords) {
                await prisma.auditScore.create({
                    data: {
                        auditId: audit.id,
                        criterionId: crit.id,
                        score: Math.random() > 0.1 ? 100 : 0, // 90% chance of passing each point
                        criterionTitle: crit.title,
                        categoryLabel: crit.categoryName
                    }
                });
            }
        }
    }

    console.log('✅ Seeding completed successfully!');
    console.log(`
    Sample Login Details:
    --------------------
    QA Expert: qa_expert@example.com / password123
    Agent 1: agent_silver@example.com / password123
    Agent 2: agent_gold@example.com / password123
    `);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
