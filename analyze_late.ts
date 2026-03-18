
import { PrismaClient } from '@prisma/client';
import { addHours } from 'date-fns';

const prisma = new PrismaClient();

async function analyzeLateAudit(agentName: string) {
  const user = await prisma.user.findFirst({ where: { name: agentName } });
  if (!user) return;

  const audits = await prisma.audit.findMany({
    where: { agentId: user.id, score: { lt: 100 } },
    include: { coachingLog: true, campaign: true }
  });

  console.log(`Analyzing Agent 1's Audits for Timeliness...\n`);

  for (const audit of audits) {
    if (!audit.coachingLog?.agentAckAt) continue;

    const coachingReleasedAt = new Date(audit.coachingLog.releasedAt!);
    const agentAckAt = new Date(audit.coachingLog.agentAckAt);
    const ackSlaDays = audit.campaign?.coachingAckWindowDays ?? 2;
    const ackDeadline = addHours(coachingReleasedAt, ackSlaDays * 24);
    
    console.log(`Audit ID: ${audit.id}`);
    console.log(`- Coaching Released At: ${coachingReleasedAt.toISOString()}`);
    console.log(`- Agent Acknowledged At: ${agentAckAt.toISOString()}`);
    console.log(`- Acknowledgment Deadline: ${ackDeadline.toISOString()}`);
    
    const isLate = agentAckAt > ackDeadline;
    console.log(`- Result: ${isLate ? 'LATE' : 'ON-TIME/EARLY'}`);
    console.log('-----------------------------------');
  }
}

analyzeLateAudit('Agent 1')
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
