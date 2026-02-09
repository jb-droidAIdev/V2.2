import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.userRole.findMany();
    const permissions = await prisma.permission.findMany();
    console.log('--- DB Content Check ---');
    console.log('Roles Count:', roles.length);
    console.log('Permissions Count:', permissions.length);

    if (roles.length > 0) {
        console.log('Roles:', JSON.stringify(roles, null, 2));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
