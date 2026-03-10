import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const users = await prisma.user.findMany({
        take: 5,
        select: { id: true, name: true, role: true }
    });
    console.log(JSON.stringify(users, null, 2));
    await prisma.$disconnect();
}

main();
