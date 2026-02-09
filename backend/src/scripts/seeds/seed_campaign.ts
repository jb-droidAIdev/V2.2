import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const existing = await prisma.campaign.findFirst();
    if (!existing) {
        await prisma.campaign.create({
            data: {
                name: 'Test Campaign 2026',
                samplingRate: 5.0,
                type: 'USER'
            }
        });
        console.log('Created Test Campaign');
    } else {
        console.log('Campaign already exists');
    }
}
main().finally(() => prisma.$disconnect());
