import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const permissions = await (prisma as any).permission.findMany();
    console.log('--- Permissions in DB ---');
    console.log(permissions.map((p: any) => p.code).join(', '));
}

main()
    .catch((e: Error) => {
        console.error(e);
    })
    .finally(async () => {
        await (prisma as any).$disconnect();
    });
