import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    const legacyAudits = await prisma.audit.findMany({
      where: {
        isLegacy: true,
      }
    });

    let updatedCount = 0;
    for (const audit of legacyAudits) {
        const metadata = audit.legacyMetadata as any;
        const row = metadata?.mergedRows?.[0] || {};
        const transactionDateStr = row['Date of Transaction'] || row['Date'];
        const auditDateStr = row['Date of Audit'] || row['Date'] || transactionDateStr;

        if (!transactionDateStr) continue;

        const parseDate = (val: any) => {
            if (typeof val === 'number' && val > 20000 && val < 100000) {
                return new Date(Math.round((val - 25569) * 86400 * 1000));
            }
            return new Date(val);
        };
        
        const transDate = parseDate(transactionDateStr);
        const auditDate = parseDate(auditDateStr);

        if (!isNaN(auditDate.getTime()) && auditDate.getFullYear() > 2000) {
            await prisma.audit.update({
                where: { id: audit.id },
                data: {
                    startedAt: transDate,
                    submittedAt: auditDate,
                    releasedAt: auditDate,
                    lastActionAt: auditDate
                }
            });
            updatedCount++;
        }
    }
    console.log(`Fixed dates for ${updatedCount} legacy audits from 1970 to reality.`);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
