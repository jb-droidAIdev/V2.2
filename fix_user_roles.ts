import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Fixing User Role IDs ---');

    // 1. Get all roles from UserRole table
    const roles = await prisma.userRole.findMany();
    const roleMap: Record<string, string> = {};
    roles.forEach(r => {
        roleMap[r.name] = r.id;
    });

    console.log('Available Roles in DB:', roles.map(r => r.name).join(', '));

    // 2. Find all users where roleId is null
    const usersToUpdate = await prisma.user.findMany({
        where: {
            roleId: null
        }
    });

    console.log(`Found ${usersToUpdate.length} users with missing roleId.`);

    let updatedCount = 0;
    for (const user of usersToUpdate) {
        const roleId = roleMap[user.role];
        if (roleId) {
            await prisma.user.update({
                where: { id: user.id },
                data: { roleId }
            });
            updatedCount++;
        } else {
            console.warn(`Could not find UserRole for role: ${user.role} (User: ${user.email})`);
        }
    }

    console.log(`Updated ${updatedCount} users successfully.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
