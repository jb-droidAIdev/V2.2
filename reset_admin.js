const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@flatworld.ph' }
    });
    if (user) {
        console.log('Failed Attempts:', user.failedLoginAttempts);
        console.log('Lockout Until:', user.lockoutUntil);

        if (user.failedLoginAttempts > 0) {
            console.log('Resetting lockout for debugging...');
            await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockoutUntil: null }
            });
            console.log('Reset complete.');
        }
    }
    await prisma.$disconnect();
}

check();
