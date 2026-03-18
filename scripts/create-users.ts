import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Creating requested users and campaigns...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Get Roles
    const agentRole = await prisma.userRole.findUnique({ where: { name: 'AGENT' } });
    const opsTlRole = await prisma.userRole.findUnique({ where: { name: 'OPS_TL' } });
    const opsManagerRole = await prisma.userRole.findUnique({ where: { name: 'OPS_MANAGER' } });
    const qaRole = await prisma.userRole.findUnique({ where: { name: 'QA' } });
    const qaTlRole = await prisma.userRole.findUnique({ where: { name: 'QA_TL' } });

    // 1. Users
    const manager = await prisma.user.create({
        data: {
            email: 'opsmanager1@example.com',
            name: 'OPS Manager 1',
            password: hashedPassword,
            role: 'OPS_MANAGER',
            roleId: opsManagerRole?.id,
            isActive: true,
            mustChangePassword: false,
        }
    });

    const opstl = await prisma.user.create({
        data: {
            email: 'opstl@example.com',
            name: 'OPS TL',
            password: hashedPassword,
            role: 'OPS_TL',
            roleId: opsTlRole?.id,
            manager: manager.name,
            isActive: true,
            mustChangePassword: false,
        }
    });

    const agent1 = await prisma.user.create({
        data: {
            email: 'agent1@example.com',
            name: 'Agent 1',
            password: hashedPassword,
            role: 'AGENT',
            roleId: agentRole?.id,
            supervisor: opstl.name,
            manager: manager.name,
            isActive: true,
            mustChangePassword: false,
        }
    });

    const agent2 = await prisma.user.create({
        data: {
            email: 'agent2@example.com',
            name: 'Agent 2',
            password: hashedPassword,
            role: 'AGENT',
            roleId: agentRole?.id,
            supervisor: opstl.name,
            manager: manager.name,
            isActive: true,
            mustChangePassword: false,
        }
    });

    const qatl = await prisma.user.create({
        data: {
            email: 'qatl@example.com',
            name: 'QA TL',
            password: hashedPassword,
            role: 'QA_TL',
            roleId: qaTlRole?.id,
            isActive: true,
            mustChangePassword: false,
        }
    });

    const qa = await prisma.user.create({
        data: {
            email: 'qa@example.com',
            name: 'QA',
            password: hashedPassword,
            role: 'QA',
            roleId: qaRole?.id,
            isActive: true,
            mustChangePassword: false,
            supervisor: qatl.name
        }
    });

    // 2. Campaigns
    const campaign1 = await prisma.campaign.create({
        data: {
            name: 'Campaign 1',
            isActive: true,
            type: 'USER',
        }
    });

    const campaign2 = await prisma.campaign.create({
        data: {
            name: 'Campaign 2',
            isActive: true,
            type: 'USER',
        }
    });

    console.log('Done!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
