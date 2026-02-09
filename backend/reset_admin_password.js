
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    const email = 'admin@qms.local';
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
        const user = await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                failedLoginAttempts: 0, // Unlock if locked
                lockoutUntil: null,    // Clear lockout
                isActive: true
            }
        });
        console.log(`Successfully reset password for ${email}`);
    } catch (e) {
        console.error(`Failed to reset password for ${email}:`, e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
