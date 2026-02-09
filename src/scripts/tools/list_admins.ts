import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, email: true, name: true, role: true, isActive: true, lockoutUntil: true }
    });
    console.log(JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());
