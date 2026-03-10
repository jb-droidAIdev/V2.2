import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SlaEngineService } from '../sla-engine/sla-engine.service';
import { AuditStatus } from '@prisma/client';

@Injectable()
export class ReleaseService {
  constructor(
    private prisma: PrismaService,
    private slaEngine: SlaEngineService,
  ) { }

  async releaseAudits(auditIds: string[], userId: string) {
    const results = [];

    for (const id of auditIds) {
      const audit = await this.prisma.audit.findUnique({ where: { id } });
      if (!audit || audit.status !== AuditStatus.SUBMITTED) continue;

      // Calculate Deadline (Based on Campaign SLA - Default 3 Business Days)
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: audit.campaignId },
        select: { ztpAckSlaHours: true },
      });
      const slaDays = Math.max(1, Math.round((campaign?.ztpAckSlaHours ?? 72) / 24));

      const now = new Date();
      const deadline = await this.slaEngine.calculateDueDate(
        now,
        slaDays,
        audit.campaignId,
      );

      const updated = await this.prisma.audit.update({
        where: { id },
        data: {
          status: AuditStatus.RELEASED,
          releasedAt: now,
          agentAckDeadline: deadline,
          releaseInfo: {
            create: {
              releasedBy: userId,
              releasedAt: now,
            },
          },
        },
      });
      results.push(updated);
    }

    return { releasedCount: results.length };
  }

  async getPendingRelease() {
    return this.prisma.audit.findMany({
      where: { status: AuditStatus.SUBMITTED },
      include: {
        auditor: true,
        campaign: true,
        sampledTicket: { include: { ticket: true } },
      },
    });
  }
}
