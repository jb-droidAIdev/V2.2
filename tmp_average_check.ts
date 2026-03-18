import { PrismaClient, AuditStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAverage() {
  try {
    const audits = await prisma.audit.findMany({
      where: {
        status: {
          in: [
            'SUBMITTED',
            'RELEASED',
            'DISPUTED',
            'REAPPEALED',
            'ACKNOWLEDGED',
          ] as any,
        },
      },
      select: {
        id: true,
        score: true,
        status: true,
        ticketReference: true,
      },
    });

    console.log('--- Audit Data for Dashboard Average ---');
    console.log(`Total Audits Found: ${audits.length}`);

    let totalScoreSum = 0;
    audits.forEach((a, index) => {
      const score = a.score || 0;
      totalScoreSum += score;
      console.log(`${index + 1}. Ticket: ${a.ticketReference || 'N/A'} | Status: ${a.status} | Score: ${score}%`);
    });

    const manualAvg = totalScoreSum / audits.length;
    console.log('\n--- Calculation ---');
    console.log(`Sum of Scores: ${totalScoreSum}`);
    console.log(`Count: ${audits.length}`);
    console.log(`Average: ${totalScoreSum} / ${audits.length} = ${manualAvg.toFixed(2)}%`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAverage();
