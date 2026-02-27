const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function reset() {
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
        where: { email: 'admin@flatworld.ph' },
        data: {
            password: hashedPassword,
            failedLoginAttempts: 0,
            lockoutUntil: null,
            isActive: true
        }
    });
    console.log('Admin password reset to: Admin@123');
    await prisma.$disconnect();
}

reset();
