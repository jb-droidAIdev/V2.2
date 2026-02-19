
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.user.count();
        console.log(`Total users: ${count}`);

        if (count > 0) {
            const admin = await prisma.user.findFirst({
                where: { role: 'ADMIN' }
            });
            console.log('Admin user found:', admin || 'No ADMIN found');
        } else {
            console.log('No users found in database.');
        }
    } catch (e) {
        console.error('Error connecting to database:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
