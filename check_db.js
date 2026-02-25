const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const count = await prisma.audit.count({
            where: {
                status: 'ACKNOWLEDGED'
            }
        });
        console.log('ACKNOWLEDGED count:', count);

        const released = await prisma.audit.count({
            where: {
                status: 'RELEASED'
            }
        });
        console.log('RELEASED count:', released);
    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
