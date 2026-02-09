import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    // Find the user with email 'admin'
    const admin = await prisma.user.findUnique({ where: { email: 'admin' } });
    if (admin) {
        console.log('Found user "admin". Updating to "admin@qms.local"');
        await prisma.user.update({
            where: { id: admin.id },
            data: { email: 'admin@qms.local' }
        });
        console.log('Updated.');
    } else {
        console.log('User "admin" not found. Checking if "admin@qms.local" exists...');
        const emailAdmin = await prisma.user.findUnique({ where: { email: 'admin@qms.local' } });
        if (emailAdmin) {
            console.log('"admin@qms.local" already exists. You can log in with this email.');
        } else {
            // Check if ANY admin exists
            const anyAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
            if (anyAdmin) {
                console.log(`Found another admin: ${anyAdmin.email}`);
            } else {
                console.log('No ADMIN found at all.');
            }
        }
    }
}
main().finally(() => prisma.$disconnect());
