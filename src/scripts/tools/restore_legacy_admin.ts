import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@example.com';
    const password = 'password123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`Restoring access for ${email}...`);

    // Check if the user exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        // Update existing user
        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                failedLoginAttempts: 0,
                lockoutUntil: null,
                mustChangePassword: false,
                isActive: true
            }
        });
        console.log(`Updated password and unlocked account for ${email}`);
    } else {
        // Check if we have the 'admin@qms.local' I just created, and rename it to keep ID stable?
        // Or just create new.
        // Let's check for 'admin@qms.local'
        const tempAdmin = await prisma.user.findUnique({ where: { email: 'admin@qms.local' } });

        if (tempAdmin) {
            console.log('Renaming temporary admin@qms.local to admin@example.com');
            await prisma.user.update({
                where: { id: tempAdmin.id },
                data: {
                    email: email,
                    password: hashedPassword,
                    failedLoginAttempts: 0,
                    lockoutUntil: null,
                    mustChangePassword: false,
                    isActive: true,
                    name: 'Admin User'
                }
            });
            console.log('Renamed and updated password.');
        } else {
            // Create brand new
            console.log('Creating new admin user...');
            await prisma.user.create({
                data: {
                    email,
                    name: 'Admin User',
                    password: hashedPassword,
                    role: 'ADMIN',
                    failedLoginAttempts: 0,
                    mustChangePassword: false
                }
            });
            console.log(`Created new admin user: ${email}`);
        }
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
