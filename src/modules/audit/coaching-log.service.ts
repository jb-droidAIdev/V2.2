import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { MailService } from '../mail/mail.service';
import {
  CreateCoachingLogDto,
  UpdateCoachingLogDto,
} from './dto/coaching-log.dto';

@Injectable()
export class CoachingLogService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
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
      return { audit };
    }

    return log;
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
    const log = await this.prisma.coachingLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Coaching log not found');
    if (!log.releasedAt)
      throw new BadRequestException('Coaching log is not released yet');

    return this.prisma.coachingLog.update({
      where: { id },
      data: {
        agentCommitment: commitment,
        agentAckAt: new Date(),
      },
    });
  }
}
