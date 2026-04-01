import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    // 1. Fix Legacy Imports imported as 100% instead of 0% due to the old '0 || 100' bug
    // If you imported "Score" as 0, but it shows 100, we update it.
    console.log('Fetching legacy audits...');
    const legacyAudits = await prisma.audit.findMany({
      where: {
        isLegacy: true,
      },
      include: {
        scores: true
      }
    });

    let updatedCount = 0;
    for (const audit of legacyAudits) {
      const isAutoFailed = audit.isAutoFailed;
      const metadata = audit.legacyMetadata as any;
      if (audit.score === 100 && isAutoFailed) {
        // Since isAutoFailed was provided as TRUE explicitly by the user, we assume the intended score was 0.
        await prisma.audit.update({
          where: { id: audit.id },
          data: { score: 0 }
        });
        updatedCount++;
      } else if (audit.score === 100 && metadata) {
         // Maybe score was literally 0 in the CSV? Let's check metadata if they passed 0
         const row = metadata.mergedRows?.[0] || {};
         const scoreInput = row['Score (%)'] ?? row['Score'];
         if (scoreInput === 0 || scoreInput === '0') {
            await prisma.audit.update({
              where: { id: audit.id },
              data: { score: 0 }
            });
            updatedCount++;
         }
      }
    }
    console.log(`Updated ${updatedCount} legacy audits from 100% back to 0% based on import metadata/auto-fail.`);

    // 2. See why ZTP didn't trigger
    const ag001 = await prisma.user.findFirst({ where: { eid: 'AG001' } });
    if (!ag001) {
       console.log("No agent AG001 found.");
       return;
    }

    const fails = await prisma.auditScore.findMany({
        where: { isFailed: true, audit: { agentId: ag001.id } },
        select: { categoryLabel: true, criterionTitle: true, audit: { select: { submittedAt: true, status: true } } }
    });
    console.log('\n--- AG001 FAILURES IN DB ---');
    console.log(JSON.stringify(fails, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
