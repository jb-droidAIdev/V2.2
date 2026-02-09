import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany();
    console.log('--- USER LIST ---');
    users.forEach(u => console.log(`${u.email} [${u.role}] (Locked: ${u.lockoutUntil})`));
    console.log('-----------------');
}
main().finally(() => prisma.$disconnect());
