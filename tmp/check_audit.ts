
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const audit = await prisma.audit.findUnique({
        where: { id: 'f555abf9-a831-48ae-8863-0301af9389ec' },
        include: { campaign: true }
    });
    console.log(JSON.stringify(audit, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
