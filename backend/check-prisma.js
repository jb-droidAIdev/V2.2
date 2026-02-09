
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Models:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
    await prisma.$connect();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
