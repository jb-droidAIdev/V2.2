import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const audits = await prisma.audit.findMany({
        where: {
            id: {
                in: [
                    '08d44ddc-6fd6-46fd-aec5-47b282ea890b',
                    'fe22de1d-93ad-4d72-8a57-a3c044b648cd',
                    '0cd9a5e3-5b94-497e-a0d8-67b4df65943e',
                    'a620af0b-96b5-4ee8-8b72-d6577e121681'
                ]
            }
        },
        select: { id: true, status: true }
    });
    console.log(JSON.stringify(audits, null, 2));
    await prisma.$disconnect();
}

main();
