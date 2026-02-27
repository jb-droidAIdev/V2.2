const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@flatworld.ph' },
        include: { userRole: true }
    });
    if (user) {
        console.log('User found:');
        console.log('Email:', user.email);
        console.log('Role String:', user.role);
        console.log('Role Object:', user.userRole?.name);
        console.log('Is Active:', user.isActive);
        console.log('Must Change Pass:', user.mustChangePassword);
    } else {
        console.log('Admin user NOT FOUND in database.');
    }
    await prisma.$disconnect();
}

check();
