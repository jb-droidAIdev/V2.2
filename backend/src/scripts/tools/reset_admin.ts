import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Connecting to database...');
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users.`);

    users.forEach(u => {
        console.log(`- ${u.email} (${u.role}) [ID: ${u.id}] Locked: ${u.lockoutUntil}`);
    });

    // Find an Admin
    let targetUser = users.find(u => u.role === 'ADMIN');

    if (!targetUser) {
        console.log('No ADMIN user found! Creating one...');
        const hashedPassword = await bcrypt.hash('Standard123!', 10);
        targetUser = await prisma.user.create({
            data: {
                email: 'admin@qms.local',
                name: 'System Admin',
                password: hashedPassword,
                role: 'ADMIN',
                failedLoginAttempts: 0,
                lockoutUntil: null
            }
        });
        console.log(`Created admin user: ${targetUser.email} / Standard123!`);
    } else {
        console.log(`Updating password for existing admin: ${targetUser.email}`);
        const hashedPassword = await bcrypt.hash('Standard123!', 10);
        await prisma.user.update({
            where: { id: targetUser.id },
            data: {
                password: hashedPassword,
                failedLoginAttempts: 0,
                lockoutUntil: null
            }
        });
        console.log('Password reset and account unlocked.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
