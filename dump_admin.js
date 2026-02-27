const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@flatworld.ph' },
        include: {
            userRole: {
                include: {
                    permissions: {
                        include: { permission: true }
                    }
                }
            }
        }
    });
    console.log(JSON.stringify(user, null, 2));
}

main().finally(() => prisma.$disconnect());
