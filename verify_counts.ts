import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const campaigns = await prisma.campaign.findMany();
    const forms = await prisma.monitoringForm.findMany();
    const audits = await prisma.audit.findMany();

    console.log('Campaigns Count:', campaigns.length);
    console.log('Forms Count:', forms.length);
    console.log('Audits Count:', audits.length);

    if (campaigns.length > 0) {
        console.log('First Campaign:', campaigns[0].name);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
