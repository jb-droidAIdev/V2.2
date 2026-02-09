"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new client_1.PrismaClient();
async function main() {
    const email = 'admin@example.com';
    const password = 'password123!';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`Restoring access for ${email}...`);
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });
    if (existingUser) {
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
    }
    else {
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
        }
        else {
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
//# sourceMappingURL=restore_legacy_admin.js.map