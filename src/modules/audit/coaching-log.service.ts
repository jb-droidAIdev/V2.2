import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditStatus } from '@prisma/client';
import {
  CreateCoachingLogDto,
  UpdateCoachingLogDto,
} from './dto/coaching-log.dto';

import { SlaEngineService } from '../sla-engine/sla-engine.service';
import { endOfDay } from 'date-fns';

@Injectable()
export class CoachingLogService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private slaEngine: SlaEngineService,
  ) {}

  async findByAuditId(auditId: string) {
    const log = await this.prisma.coachingLog.findUnique({
      where: { auditId },
      include: {
        supervisor: { select: { id: true, name: true, email: true } },
        audit: {
          include: {
            agent: { select: { id: true, name: true, email: true } },
            auditor: { select: { id: true, name: true, email: true } },
            scores: {
              include: { criterion: true },
            },
            formVersion: {
              include: { criteria: true },
            },
          },
        },
      },
    });

    if (!log) {
      const audit = await this.prisma.audit.findUnique({
        where: { id: auditId },
        include: {
          agent: { select: { id: true, name: true, email: true } },
          auditor: { select: { id: true, name: true, email: true } },
          scores: {
            include: { criterion: true },
          },
          formVersion: {
            include: { criteria: true },
          },
        },
      });

      if (!audit) throw new NotFoundException('Audit not found');
      
      const campaign = await this.prisma.campaign.findUnique({ where: { id: audit.campaignId } });
      const releaseSlaDays = campaign?.coachingReleaseWindowDays ?? 3;
      const releaseBasis = audit.submittedAt || audit.startedAt;
      let releaseDeadline = null;
      if (releaseBasis) {
        const rDeadlineDate = await this.slaEngine.calculateDueDate(new Date(releaseBasis), releaseSlaDays, audit.campaignId);
        releaseDeadline = endOfDay(rDeadlineDate);
      }

      return { audit, releaseDeadline };
    }

    const auditIdForSla = log.audit.id;
    const campaignId = log.audit.campaignId;
    const releaseAt = log.releasedAt;

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    
    let ackDeadline = null;
    if (releaseAt) {
      const ackSlaDays = campaign?.coachingAckWindowDays ?? 2;
      const deadlineDate = await this.slaEngine.calculateDueDate(new Date(releaseAt), ackSlaDays, campaignId);
      ackDeadline = endOfDay(deadlineDate);
    }

    let releaseDeadline = null;
    const releaseSlaDays = campaign?.coachingReleaseWindowDays ?? 3;
    const releaseBasis = log.audit.submittedAt || log.audit.startedAt;
    if (releaseBasis) {
      const rDeadlineDate = await this.slaEngine.calculateDueDate(new Date(releaseBasis), releaseSlaDays, campaignId);
      releaseDeadline = endOfDay(rDeadlineDate);
    }

    return { ...log, ackDeadline, releaseDeadline };
  }

  async upsert(userId: string, data: CreateCoachingLogDto) {
    const audit = await this.prisma.audit.findUnique({
      where: { id: data.auditId },
    });

    if (!audit) throw new NotFoundException('Audit not found');

    return this.prisma.coachingLog.upsert({
      where: { auditId: data.auditId },
      update: {
        supervisorRemarks: data.supervisorRemarks,
        actionPlan: data.actionPlan as any,
        supervisorId: userId,
      },
      create: {
        auditId: data.auditId,
        supervisorId: userId,
        supervisorRemarks: data.supervisorRemarks,
        actionPlan: data.actionPlan as any,
      },
    });
  }

  async release(id: string) {
    const log = await this.prisma.coachingLog.findUnique({
      where: { id },
      include: {
        audit: {
          include: {
            agent: true,
            sampledTicket: { include: { ticket: true } },
          },
        },
        supervisor: true,
      },
    });

    if (!log) throw new NotFoundException('Coaching log not found');

    const updated = await this.prisma.coachingLog.update({
      where: { id },
      data: { releasedAt: new Date() },
    });

    const ticketId =
      log.audit.sampledTicket?.ticket?.externalTicketId ||
      log.audit.ticketReference ||
      'N/A';

    await this.mailService.sendCoachingReleasedToAgent({
      to: log.audit.agent.email,
      agentName: log.audit.agent.name,
      ticketId,
      supervisorName: log.supervisor.name,
    });

    return updated;
  }

  async acknowledge(id: string, commitment: string) {
    const log = await this.prisma.coachingLog.findUnique({
      where: { id },
      include: { audit: true },
    });
    if (!log) throw new NotFoundException('Coaching log not found');
    if (!log.releasedAt)
      throw new BadRequestException('Coaching log is not released yet');

    // SLA Enforcement: Verify if the acknowledgment window has expired
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: log.audit.campaignId },
    });
    
    const ackSlaDays = campaign?.coachingAckWindowDays ?? 2;
    const deadlineDate = await this.slaEngine.calculateDueDate(new Date(log.releasedAt), ackSlaDays, log.audit.campaignId);
    const deadline = endOfDay(deadlineDate);

    if (new Date() > deadline) {
      throw new BadRequestException('The acknowledgment window for this coaching log has expired. Please contact your supervisor.');
    }

    return this.prisma.$transaction([
      this.prisma.coachingLog.update({
        where: { id },
        data: {
          agentCommitment: commitment,
          agentAckAt: new Date(),
        },
      }),
      this.prisma.audit.update({
        where: { id: log.auditId },
        data: {
          status: AuditStatus.ACKNOWLEDGED,
          lastActionAt: new Date(),
        },
      }),
    ]);
  }
}
