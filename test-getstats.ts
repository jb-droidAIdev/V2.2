import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const audits = await prisma.audit.findMany({
            where: {
                status: {
                    in: ['RELEASED', 'DISPUTED', 'REAPPEALED', 'ACKNOWLEDGED'] as any
                }
            },
            take: 1
        });
        console.log("Success:", audits.length);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
