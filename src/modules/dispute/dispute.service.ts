import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditStatus, DisputeStatus, DisputeVerdict } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { differenceInBusinessDays } from 'date-fns';

import { MailService } from '../mail/mail.service';

@Injectable()
export class DisputeService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private mailService: MailService,
  ) { }

  async createDispute(
    auditId: string,
    userId: string,
    data: { items: { criterionId: string; reason: string }[] },
  ) {
    const audit = await this.prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        dispute: true,
        agent: true,
        auditor: true,
        campaign: true,
      },
    });

    if (!audit) throw new NotFoundException('Audit not found');
    if (audit.dispute)
      throw new BadRequestException('Dispute already exists for this audit');

    // Stage 1 Constraints
    const lastActionAt = audit.submittedAt || audit.startedAt;
    const daysDiff = differenceInBusinessDays(
      new Date(),
      new Date(lastActionAt),
    );
    const disputeWindow = audit.campaign?.disputeWindowDays ?? 5;
    if (daysDiff > disputeWindow)
      throw new BadRequestException(
        `Dispute must be filed within ${disputeWindow} business days`,
      );

    if (!data.items || data.items.length === 0)
      throw new BadRequestException('No parameters selected for dispute');

    data.items.forEach((item) => {
      if (item.reason.length < 30) {
        throw new BadRequestException(
          `Reason for parameter challenge must be at least 30 characters`,
        );
      }
    });

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.audit.update({
        where: { id: auditId },
        data: {
          status: AuditStatus.DISPUTED,
          lastActionAt: new Date(),
        },
      });

      return tx.dispute.create({
        data: {
          auditId,
          raisedById: userId,
          status: DisputeStatus.PENDING_QA_REVIEW,
          items: {
            create: data.items.map((item) => ({
              criterionId: item.criterionId,
              reason: item.reason,
            })),
          },
        },
        include: { raisedBy: true },
      });
    });

    // --- NOTIFICATION ---
    try {
      const emails = await this.getHierarchyEmails(audit.agent, audit.auditor);

      // 1. Send to Auditor (No CC)
      await this.mailService.sendDisputeToAuditor({
        to: audit.auditor.email,
        auditorName: audit.auditor.name,
        ticketId: audit.ticketReference || 'N/A',
        agentName: audit.agent.name,
        opsTlName: result.raisedBy.name,
        reason: data.items.map((i) => i.reason).join(' | '),
      });

      // 2. Send to QA Leadership (With Manager CC)
      const qaTl = await this.prisma.user.findFirst({
        where: { role: 'QA_TL', isActive: true },
        select: { email: true, name: true },
      });
      if (qaTl?.email) {
        await this.mailService.sendDisputeToQaLeadership({
          to: qaTl.email,
          cc: emails.qaVips.filter((e) => e !== qaTl.email), // QA Managers as CC
          qaTlName: qaTl.name,
          ticketId: audit.ticketReference || 'N/A',
          agentName: audit.agent.name,
          auditorName: audit.auditor.name,
          opsTlName: result.raisedBy.name,
        });
      }
    } catch (e) {
      console.warn('Dispute email failed', e);
    }

    return result;
  }

  async qaVerdict(
    disputeId: string,
    auditorId: string,
    itemId: string,
    data: { verdict: DisputeVerdict; comment: string },
  ) {
    const item = await this.prisma.disputeItem.findUnique({
      where: { id: itemId },
      include: {
        dispute: {
          include: {
            audit: {
              include: { agent: true, auditor: true },
            },
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Dispute item not found');

    const user = await this.prisma.user.findUnique({
      where: { id: auditorId },
    });
    const isAdmin = user?.role === 'ADMIN';

    if (item.dispute.audit.auditorId !== auditorId && !isAdmin) {
      throw new ForbiddenException(
        'Only the original QA or an Admin can provide the first verdict',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.disputeItem.update({
        where: { id: itemId },
        data: {
          qaVerdict: data.verdict,
          qaComment: data.comment,
          qaReviewedById: auditorId,
          qaReviewedAt: new Date(),
        },
      });

      if (data.verdict === DisputeVerdict.ACCEPTED) {
        await this.applyCorrection(tx, item.dispute.auditId, item.criterionId);
      }

      const allItems = await tx.disputeItem.findMany({
        where: { disputeId },
        include: { dispute: true },
      });
      const allReviewed = allItems.every((i) => !!i.qaVerdict);

      if (allReviewed) {
        const anyRejected = allItems.some(
          (i) => i.qaVerdict === DisputeVerdict.REJECTED,
        );
        const allAccepted = allItems.every(
          (i) => i.qaVerdict === DisputeVerdict.ACCEPTED,
        );

        await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status: anyRejected
              ? DisputeStatus.QA_REJECTED
              : DisputeStatus.FINALIZED,
          },
        });

        await tx.audit.update({
          where: { id: item.dispute.auditId },
          data: { lastActionAt: new Date() },
        });

        if (allAccepted) {
          const audit = await tx.audit.findUnique({
            where: { id: item.dispute.auditId },
          });
          await tx.audit.update({
            where: { id: item.dispute.auditId },
            data: {
              status: AuditStatus.RELEASED,
              lastActionAt: new Date(),
            },
          });

          // --- RESOLUTION NOTIFICATION (ACCEPTED) ---
          try {
            const { audit } = item.dispute;
            const emails = await this.getHierarchyEmails(
              audit.agent,
              audit.auditor,
            );
            const raisedBy = await this.prisma.user.findUnique({
              where: { id: item.dispute.raisedById },
            });

            // 1. Send to Agent (No CC)
            await this.mailService.sendResolutionToAgent({
              to: audit.agent.email,
              agentName: audit.agent.name,
              ticketId: audit.ticketReference || 'N/A',
              verdict: 'ACCEPTED',
              rationale: allItems.map((i) => i.qaComment).join(' | '),
            });

            // 2. Send to Ops TL (With Manager CC)
            if (raisedBy?.email) {
              await this.mailService.sendResolutionToOps({
                to: raisedBy.email,
                cc: Array.from(
                  new Set([
                    ...emails.opsVips,
                    ...emails.qaVips,
                    audit.auditor.email,
                  ]),
                ),
                opsTlName: raisedBy.name,
                agentName: audit.agent.name,
                ticketId: audit.ticketReference || 'N/A',
                verdict: 'ACCEPTED',
                rationale: allItems.map((i) => i.qaComment).join(' | '),
              });
            }
          } catch (e) {
            console.warn('Resolution email failed', e);
          }
        }
      }

      return updatedItem;
    });
  }

  async reappeal(
    disputeId: string,
    userId: string,
    data: { reappealReason: string },
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        items: true,
        audit: {
          include: { agent: true, auditor: true, campaign: true },
        },
      },
    });

    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== DisputeStatus.QA_REJECTED)
      throw new BadRequestException('Can only re-appeal after QA rejection');
    if (data.reappealReason.length < 30)
      throw new BadRequestException('Reason must be at least 30 characters');

    const lastQaReview = Math.max(
      ...dispute.items.map((i) => i.qaReviewedAt?.getTime() || 0),
    );
    const daysDiff = differenceInBusinessDays(
      new Date(),
      new Date(lastQaReview),
    );
    const reappealWindow = dispute.audit.campaign?.reappealWindowDays ?? 3;
    if (daysDiff > reappealWindow)
      throw new BadRequestException(
        `Re-appeal must be filed within ${reappealWindow} business days`,
      );

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.audit.update({
        where: { id: dispute.auditId },
        data: {
          status: AuditStatus.REAPPEALED,
          lastActionAt: new Date(),
        },
      });

      await tx.dispute.update({
        where: { id: disputeId },
        data: { status: DisputeStatus.REAPPEALED },
      });

      const rejectedItems = dispute.items.filter(
        (i) => i.qaVerdict === DisputeVerdict.REJECTED,
      );
      for (const item of rejectedItems) {
        await tx.disputeItem.update({
          where: { id: item.id },
          data: {
            reappealReason: data.reappealReason,
            reappealedAt: new Date(),
          },
        });
      }

      return { status: 'reappealed' };
    });

    // --- NOTIFICATION ---
    try {
      const { audit } = dispute;
      const emails = await this.getHierarchyEmails(audit.agent, audit.auditor);

      // Send to QA Leadership (Arbiter) with CC list
      const qaTl = await this.prisma.user.findFirst({
        where: { role: 'QA_TL', isActive: true },
        select: { email: true, name: true },
      });

      if (qaTl?.email) {
        await this.mailService.sendReappealToQaLeadership({
          to: qaTl.email,
          cc: Array.from(
            new Set([
              ...emails.qaVips.filter((e) => e !== qaTl.email),
              ...emails.opsVips,
              audit.auditor.email,
              audit.agent.email,
            ]),
          ),
          qaTlName: qaTl.name,
          ticketId: audit.ticketReference || 'N/A',
          agentName: audit.agent.name,
          auditorName: audit.auditor.name,
          reason: data.reappealReason,
        });
      }
    } catch (e) {
      console.warn('Reappeal email failed', e);
    }

    return result;
  }

  async finalVerdict(
    disputeId: string,
    adminId: string,
    itemId: string,
    data: { verdict: DisputeVerdict; comment: string },
  ) {
    const item = await this.prisma.disputeItem.findUnique({
      where: { id: itemId },
      include: {
        dispute: {
          include: {
            audit: {
              include: { agent: true, auditor: true },
            },
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Item not found');

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.disputeItem.update({
        where: { id: itemId },
        data: {
          finalVerdict: data.verdict,
          finalComment: data.comment,
          finalizedById: adminId,
          finalizedAt: new Date(),
        },
      });

      if (data.verdict === DisputeVerdict.ACCEPTED) {
        await this.applyCorrection(tx, item.dispute.auditId, item.criterionId);
      }

      const allItems = await tx.disputeItem.findMany({
        where: { disputeId },
        include: { dispute: true },
      });
      const allDone = allItems.every(
        (i) => i.qaVerdict === DisputeVerdict.ACCEPTED || !!i.finalVerdict,
      );

      if (allDone) {
        await tx.dispute.update({
          where: { id: disputeId },
          data: { status: DisputeStatus.FINALIZED },
        });

        const auditId = allItems[0].dispute.auditId;
        const anyFinalAccepted = allItems.some(
          (i) => i.finalVerdict === DisputeVerdict.ACCEPTED,
        );

        const finalVerdictLabel =
          anyFinalAccepted ||
            allItems.every((i) => i.qaVerdict === DisputeVerdict.ACCEPTED)
            ? 'ACCEPTED'
            : 'REJECTED';

        if (finalVerdictLabel === 'ACCEPTED') {
          const audit = await tx.audit.findUnique({ where: { id: auditId } });
          await tx.audit.update({
            where: { id: auditId },
            data: {
              status: AuditStatus.RELEASED,
              lastActionAt: new Date(),
            },
          });
        } else {
          await tx.audit.update({
            where: { id: auditId },
            data: {
              status: AuditStatus.REAPPEALED,
              lastActionAt: new Date(),
            },
          });
        }

        // --- FINAL RESOLUTION NOTIFICATION ---
        try {
          const { audit } = item.dispute;
          const emails = await this.getHierarchyEmails(
            audit.agent,
            audit.auditor,
          );
          const raisedBy = await this.prisma.user.findUnique({
            where: { id: item.dispute.raisedById },
          });

          // 1. Send to Agent (No CC)
          await this.mailService.sendResolutionToAgent({
            to: audit.agent.email,
            agentName: audit.agent.name,
            ticketId: audit.ticketReference || 'N/A',
            verdict: finalVerdictLabel as any,
            rationale: allItems
              .map((i) => i.finalComment || i.qaComment)
              .join(' | '),
          });

          // 2. Send to Ops TL (With Manager CC)
          if (raisedBy?.email) {
            await this.mailService.sendResolutionToOps({
              to: raisedBy.email,
              cc: Array.from(
                new Set([
                  ...emails.opsVips,
                  ...emails.qaVips,
                  audit.auditor.email,
                ]),
              ),
              opsTlName: raisedBy.name,
              agentName: audit.agent.name,
              ticketId: audit.ticketReference || 'N/A',
              verdict: finalVerdictLabel as any,
              rationale: allItems
                .map((i) => i.finalComment || i.qaComment)
                .join(' | '),
            });
          }
        } catch (e) {
          console.warn('Final verdict email failed', e);
        }
      }

      return updatedItem;
    });
  }

  private async getHierarchyEmails(agent: any, auditor: any) {
    const opsVips: string[] = [];
    const qaVips: string[] = [];

    // Ops
    if (agent.supervisor) {
      const sup = await this.prisma.user.findFirst({
        where: {
          name: { equals: agent.supervisor.trim(), mode: 'insensitive' },
        },
        select: { email: true },
      });
      if (sup?.email) opsVips.push(sup.email);
    }
    if (agent.manager) {
      const mgr = await this.prisma.user.findFirst({
        where: { name: { equals: agent.manager.trim(), mode: 'insensitive' } },
        select: { email: true },
      });
      if (mgr?.email) opsVips.push(mgr.email);
    }

    // QA
    const qas = await this.prisma.user.findMany({
      where: {
        role: { in: ['QA_TL', 'QA_MANAGER'] },
        isActive: true,
      },
      select: { email: true },
    });
    qas.forEach((u) => u.email && qaVips.push(u.email));

    return { opsVips, qaVips };
  }

  private async applyCorrection(tx: any, auditId: string, criterionId: string) {
    // 1. Find criterion weight
    const criterion = await tx.formCriterion.findUnique({
      where: { id: criterionId },
    });

    // 2. Update AuditScore to "Pass" (full weight)
    await tx.auditScore.updateMany({
      where: { auditId, criterionId },
      data: { score: criterion.weight, isFailed: false },
    });

    // 3. Recalculate total score
    const allScores = await tx.auditScore.findMany({ where: { auditId } });
    const audit = await tx.audit.findUnique({
      where: { id: auditId },
      include: { formVersion: { include: { criteria: true } } },
    });

    const { percent, isAutoFailed } = this.auditService.calculateScore(
      audit.formVersion.criteria,
      allScores,
    );

    await tx.audit.update({
      where: { id: auditId },
      data: { score: percent, isAutoFailed },
    });
  }

  async findAll() {
    return this.prisma.dispute.findMany({
      include: {
        audit: {
          include: {
            agent: { select: { name: true, eid: true } },
            campaign: { select: { name: true, projectCode: true } },
            sampledTicket: { include: { ticket: true } },
          },
        },
        raisedBy: { select: { name: true } },
        items: { include: { criterion: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAudit(auditId: string) {
    return this.prisma.dispute.findUnique({
      where: { auditId },
      include: {
        raisedBy: { select: { name: true } },
        items: {
          include: {
            criterion: true,
          },
        },
      },
    });
  }
}
