import { PrismaClient, Role } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const tl = await prisma.user.findFirst({
            where: { role: Role.OPS_TL }
        });
        if (!tl) return;

        console.log(`TL Name: ${tl.name}`);

        const agentsWithSupervisor = await prisma.user.count({
            where: { supervisor: tl.name }
        });
        console.log(`Agents with this TL as supervisor: ${agentsWithSupervisor}`);

        const agentsWithTLIdAsSupervisor = await prisma.user.count({
            where: { supervisor: tl.id }
        });
        console.log(`Agents with this TL ID as supervisor: ${agentsWithTLIdAsSupervisor}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
