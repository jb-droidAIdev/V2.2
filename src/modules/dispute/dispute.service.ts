import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditStatus, DisputeStatus, DisputeVerdict } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { differenceInBusinessDays } from 'date-fns';

@Injectable()
export class DisputeService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService
    ) { }

    async createDispute(auditId: string, userId: string, data: { items: { criterionId: string; reason: string }[] }) {
        const audit = await this.prisma.audit.findUnique({
            where: { id: auditId },
            include: { dispute: true }
        });

        if (!audit) throw new NotFoundException('Audit not found');
        if (audit.dispute) throw new BadRequestException('Dispute already exists for this audit');

        // Stage 1 Constraints
        // 1. Deadline: 5 business days
        const lastActionAt = audit.submittedAt || audit.startedAt;
        const daysDiff = differenceInBusinessDays(new Date(), new Date(lastActionAt));
        if (daysDiff > 5) throw new BadRequestException('Dispute must be filed within 5 business days');

        // 2. items check
        if (!data.items || data.items.length === 0) throw new BadRequestException('No parameters selected for dispute');

        data.items.forEach(item => {
            if (item.reason.length < 30) {
                throw new BadRequestException(`Reason for parameter challenge must be at least 30 characters`);
            }
        });

        return this.prisma.$transaction(async (tx) => {
            // Update Audit status
            await tx.audit.update({
                where: { id: auditId },
                data: { status: AuditStatus.DISPUTED }
            });

            return tx.dispute.create({
                data: {
                    auditId,
                    raisedById: userId,
                    status: DisputeStatus.PENDING_QA_REVIEW,
                    items: {
                        create: data.items.map(item => ({
                            criterionId: item.criterionId,
                            reason: item.reason
                        }))
                    }
                }
            });
        });
    }

    async qaVerdict(disputeId: string, auditorId: string, itemId: string, data: { verdict: DisputeVerdict; comment: string }) {
        const item = await this.prisma.disputeItem.findUnique({
            where: { id: itemId },
            include: { dispute: { include: { audit: true } } }
        });

        if (!item) throw new NotFoundException('Dispute item not found');
        // Check if auditor is the one who did the audit
        if (item.dispute.audit.auditorId !== auditorId) throw new ForbiddenException('Only the original QA can provide the first verdict');

        return this.prisma.$transaction(async (tx) => {
            const updatedItem = await tx.disputeItem.update({
                where: { id: itemId },
                data: {
                    qaVerdict: data.verdict,
                    qaComment: data.comment,
                    qaReviewedById: auditorId,
                    qaReviewedAt: new Date()
                }
            });

            // If Accepted, fix the score
            if (data.verdict === DisputeVerdict.ACCEPTED) {
                await this.applyCorrection(tx, item.dispute.auditId, item.criterionId);
            }

            // Check if all items in this dispute were reviewed
            const allItems = await tx.disputeItem.findMany({ where: { disputeId } });
            const allReviewed = allItems.every(i => !!i.qaVerdict);

            if (allReviewed) {
                const anyRejected = allItems.some(i => i.qaVerdict === DisputeVerdict.REJECTED);
                await tx.dispute.update({
                    where: { id: disputeId },
                    data: { status: anyRejected ? DisputeStatus.QA_REJECTED : DisputeStatus.FINALIZED }
                });
            }

            return updatedItem;
        });
    }

    async reappeal(disputeId: string, userId: string, data: { reappealReason: string }) {
        const dispute = await this.prisma.dispute.findUnique({
            where: { id: disputeId },
            include: { items: true, audit: true }
        });

        if (!dispute) throw new NotFoundException('Dispute not found');
        if (dispute.status !== DisputeStatus.QA_REJECTED) throw new BadRequestException('Can only re-appeal after QA rejection');
        if (data.reappealReason.length < 30) throw new BadRequestException('Reason must be at least 30 characters');

        // Deadline: 3 business days after QA rejection
        const lastQaReview = Math.max(...dispute.items.map(i => i.qaReviewedAt?.getTime() || 0));
        const daysDiff = differenceInBusinessDays(new Date(), new Date(lastQaReview));
        if (daysDiff > 3) throw new BadRequestException('Re-appeal must be filed within 3 business days');

        return this.prisma.$transaction(async (tx) => {
            await tx.audit.update({
                where: { id: dispute.auditId },
                data: { status: AuditStatus.REAPPEALED }
            });

            await tx.dispute.update({
                where: { id: disputeId },
                data: { status: DisputeStatus.REAPPEALED }
            });

            // Update all rejected items with the reappeal reason
            const rejectedItems = dispute.items.filter(i => i.qaVerdict === DisputeVerdict.REJECTED);
            for (const item of rejectedItems) {
                await tx.disputeItem.update({
                    where: { id: item.id },
                    data: {
                        reappealReason: data.reappealReason,
                        reappealedAt: new Date()
                    }
                });
            }

            return { status: 'reappealed' };
        });
    }

    async finalVerdict(disputeId: string, adminId: string, itemId: string, data: { verdict: DisputeVerdict; comment: string }) {
        const item = await this.prisma.disputeItem.findUnique({
            where: { id: itemId },
            include: { dispute: { include: { audit: true } } }
        });

        if (!item) throw new NotFoundException('Item not found');

        return this.prisma.$transaction(async (tx) => {
            const updatedItem = await tx.disputeItem.update({
                where: { id: itemId },
                data: {
                    finalVerdict: data.verdict,
                    finalComment: data.comment,
                    finalizedById: adminId,
                    finalizedAt: new Date()
                }
            });

            if (data.verdict === DisputeVerdict.ACCEPTED) {
                await this.applyCorrection(tx, item.dispute.auditId, item.criterionId);
            }

            // Check overall closure
            const allItems = await tx.disputeItem.findMany({ where: { disputeId } });
            const allDone = allItems.every(i => (i.qaVerdict === DisputeVerdict.ACCEPTED) || !!i.finalVerdict);

            if (allDone) {
                await tx.dispute.update({
                    where: { id: disputeId },
                    data: { status: DisputeStatus.FINALIZED }
                });
            }

            return updatedItem;
        });
    }

    private async applyCorrection(tx: any, auditId: string, criterionId: string) {
        // 1. Find criterion weight
        const criterion = await tx.formCriterion.findUnique({ where: { id: criterionId } });

        // 2. Update AuditScore to "Pass" (full weight)
        await tx.auditScore.updateMany({
            where: { auditId, criterionId },
            data: { score: criterion.weight, isFailed: false }
        });

        // 3. Recalculate total score
        const allScores = await tx.auditScore.findMany({ where: { auditId } });
        const audit = await tx.audit.findUnique({
            where: { id: auditId },
            include: { formVersion: { include: { criteria: true } } }
        });

        const { percent, isAutoFailed } = this.auditService.calculateScore(audit.formVersion.criteria, allScores);

        await tx.audit.update({
            where: { id: auditId },
            data: { score: percent, isAutoFailed }
        });
    }

    async findAll() {
        return this.prisma.dispute.findMany({
            include: {
                audit: {
                    include: {
                        agent: { select: { name: true, eid: true } },
                        campaign: { select: { name: true } },
                        sampledTicket: { include: { ticket: true } }
                    }
                },
                raisedBy: { select: { name: true } },
                items: { include: { criterion: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findByAudit(auditId: string) {
        return this.prisma.dispute.findUnique({
            where: { auditId },
            include: {
                raisedBy: { select: { name: true } },
                items: {
                    include: {
                        criterion: true
                    }
                }
            }
        });
    }
}
