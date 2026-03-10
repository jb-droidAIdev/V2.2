import { PrismaClient, Role } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const failures = await prisma.auditScore.groupBy({
        by: ['auditId'],
        where: { isFailed: true },
        _count: true
    });

    const topAudit = failures.sort((a, b) => b._count - a._count)[0];
    if (topAudit) {
        const audit = await prisma.audit.findUnique({
            where: { id: topAudit.auditId },
            include: { agent: true }
        });
        console.log('Top failing agent:', audit?.agent.name, 'ID:', audit?.agent.id);
    }
    await prisma.$disconnect();
}

main();
