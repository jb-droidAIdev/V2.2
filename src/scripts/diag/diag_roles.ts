import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const roles = await prisma.user.groupBy({
            by: ['role'],
            _count: { _all: true }
        });
        console.log('Role Distribution:', JSON.stringify(roles, null, 2));

        const agentRole = roles.find(r => r.role === 'AGENT');
        if (agentRole) {
            const sampleAgent = await prisma.user.findFirst({
                where: { role: 'AGENT' }
            });
            console.log('Sample Agent:', JSON.stringify(sampleAgent, null, 2));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
