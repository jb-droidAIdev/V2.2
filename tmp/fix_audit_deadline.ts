
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const auditId = 'f555abf9-a831-48ae-8863-0301af9389ec';
    const audit = await prisma.audit.findUnique({
        where: { id: auditId },
        include: { campaign: true }
    });

    if (audit && audit.releasedAt) {
        const slaHours = audit.campaign.ztpAckSlaHours || 24;
        const newDeadline = new Date(audit.releasedAt);
        newDeadline.setHours(newDeadline.getHours() + slaHours);

        await prisma.audit.update({
            where: { id: auditId },
            data: { agentAckDeadline: newDeadline }
        });
        console.log(`Manually corrected ${auditId} deadline to: ${newDeadline.toISOString()}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
