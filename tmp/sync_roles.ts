import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Syncing user roles between Users and UserRole configuration...');

    // 1. Get all unique role strings currently used in the User table
    const uniqueRoleStrings = await prisma.user.findMany({
        distinct: ['role'],
        select: { role: true }
    });

    const rolesInUsers = uniqueRoleStrings.map(u => u.role);
    console.log(`Found roles in User table: ${rolesInUsers.join(', ')}`);

    // 2. Ensure each of these exists in the UserRole table
    for (const roleName of rolesInUsers) {
        const existing = await prisma.userRole.findUnique({
            where: { name: roleName }
        });

        if (!existing) {
            console.log(`➕ Creating missing role configuration for: ${roleName}`);
            await prisma.userRole.create({
                data: {
                    name: roleName,
                    description: `${roleName} role synchronized from user data`,
                    isSystem: true // Mark as system since it's a core role
                }
            });
        }
    }

    // 3. Update all users to ensure their roleId is correctly linked to the new/existing UserRole records
    const allRoles = await prisma.userRole.findMany();
    for (const roleRecord of allRoles) {
        const updateCount = await prisma.user.updateMany({
            where: {
                role: roleRecord.name,
                roleId: null // Only update those missing a link
            },
            data: {
                roleId: roleRecord.id
            }
        });
        if (updateCount.count > 0) {
            console.log(`🔗 Linked ${updateCount.count} users to role: ${roleRecord.name}`);
        }
    }

    console.log('✅ Synchronization complete!');
}

main()
    .catch(e => {
        console.error('❌ Sync failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
