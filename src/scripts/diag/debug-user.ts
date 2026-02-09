import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'Shara', mode: 'insensitive' } },
                { email: { contains: 'Shara', mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            email: true,
            name: true,
            eid: true,
            isActive: true,
            role: true
        }
    });

    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
