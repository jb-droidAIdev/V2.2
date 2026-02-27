import { PrismaClient, CampaignType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Adding dummy dossier data...');

    const roles = await prisma.userRole.findMany();
    const roleMap = new Map(roles.map(r => [r.name, r.id]));

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Create a Campaign/Team
    const campaign = await prisma.campaign.upsert({
        where: { id: 'dummy-campaign-1' }, // Using a fixed ID for upsert or finding by name
        update: {},
        create: {
            id: 'dummy-campaign-1',
            name: 'Alpha Project',
            projectCode: 'ALPHA-001',
            type: CampaignType.USER,
            isActive: true
        }
    });
    // Campaign model does not have a unique constraint on 'name' in schema.prisma (only @id is uuid)
    // Wait, let's check schema.prisma again. 
    // model Campaign { id String @id @default(uuid()) name String ... }
    // No @unique on name. So I should findFirst or use a fixed ID.

    console.log('✅ Campaign "Alpha Project" ready.');

    // 2. Dummy Users
    const dummyUsers = [
        {
            email: 'agent_test@example.com',
            name: 'Agent Test User',
            role: 'AGENT',
            eid: 'AGENT001',
            systemId: 'SYS_A001',
            employeeTeam: 'Alpha Project'
        },
        {
            email: 'ops_tl_test@example.com',
            name: 'Ops Team Lead User',
            role: 'OPS_TL',
            eid: 'OPST001',
            systemId: 'SYS_OT001',
            employeeTeam: 'Alpha Project'
        },
        {
            email: 'qa_test@example.com',
            name: 'QA Analyst User',
            role: 'QA',
            eid: 'QA001',
            systemId: 'SYS_Q001',
            employeeTeam: 'Alpha Project'
        }
    ];

    for (const u of dummyUsers) {
        const roleId = roleMap.get(u.role);
        await prisma.user.upsert({
            where: { email: u.email },
            update: {
                roleId: roleId,
                role: u.role,
                employeeTeam: u.employeeTeam,
                password: hashedPassword,
                isActive: true
            },
            create: {
                ...u,
                password: hashedPassword,
                roleId: roleId,
                mustChangePassword: false,
                isActive: true
            }
        });
        console.log(`✅ User "${u.name}" (${u.role}) added.`);
    }

    console.log('\n--- Credentials for Testing ---');
    console.log('Password for all users: password123');
    console.log('1. Agent: agent_test@example.com');
    console.log('2. Ops Team Lead: ops_tl_test@example.com');
    console.log('3. QA Analyst: qa_test@example.com');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
