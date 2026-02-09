import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const agent = await prisma.user.findFirst({
        where: { name: { contains: 'Jakelevi' } }
    });

    if (!agent) {
        console.log('Agent not found');
        return;
    }

    console.log('Agent:', agent.id, agent.name);

    const failures = await prisma.auditScore.findMany({
        where: {
            isFailed: true,
            audit: { agentId: agent.id }
        },
        include: {
            criterion: true,
            audit: true
        }
    });

    console.log('Failures count:', failures.length);
    failures.forEach(f => {
        console.log('- Date:', f.audit.submittedAt, 'CategoryLabel:', f.categoryLabel, 'CritCat:', f.criterion?.categoryName, 'Status:', f.audit.status);
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
