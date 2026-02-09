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
                data: {
                    status: AuditStatus.DISPUTED,
                    lastActionAt: new Date()
                }
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

        // Universal Access: Admins can provide verdicts even if they weren't the original auditor
        const user = await this.prisma.user.findUnique({ where: { id: auditorId } });
        const isAdmin = user?.role === 'ADMIN';

        if (item.dispute.audit.auditorId !== auditorId && !isAdmin) {
            throw new ForbiddenException('Only the original QA or an Admin can provide the first verdict');
        }

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

            // Refetch all items to get the latest verdicts (including the one we just set)
            const allItems = await tx.disputeItem.findMany({
                where: { disputeId },
                include: { dispute: true }
            });
            const allReviewed = allItems.every(i => !!i.qaVerdict);

            if (allReviewed) {
                const anyRejected = allItems.some(i => i.qaVerdict === DisputeVerdict.REJECTED);
                const allAccepted = allItems.every(i => i.qaVerdict === DisputeVerdict.ACCEPTED);

                await tx.dispute.update({
                    where: { id: disputeId },
                    data: { status: anyRejected ? DisputeStatus.QA_REJECTED : DisputeStatus.FINALIZED }
                });

                // Update Audit lastActionAt on significant dispute state change
                await tx.audit.update({
                    where: { id: allItems[0].dispute.auditId },
                    data: { lastActionAt: new Date() }
                });

                // Update Audit Status based on QA verdict
                const auditId = allItems[0].dispute.auditId;
                if (allAccepted) {
                    // QA Reviewed (Accepted) - Audit moves to "Resolved" (RELEASED)
                    await tx.audit.update({
                        where: { id: auditId },
                        data: {
                            status: AuditStatus.RELEASED,
                            lastActionAt: new Date()
                        }
                    });
                }
                // If any rejected, audit stays DISPUTED until re-appeal or deadline
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
                data: {
                    status: AuditStatus.REAPPEALED,
                    lastActionAt: new Date()
                }
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

            // Refetch all items to get the latest verdicts (including the one we just set)
            const allItems = await tx.disputeItem.findMany({
                where: { disputeId },
                include: { dispute: true }
            });
            const allDone = allItems.every(i => (i.qaVerdict === DisputeVerdict.ACCEPTED) || !!i.finalVerdict);

            if (allDone) {
                await tx.dispute.update({
                    where: { id: disputeId },
                    data: { status: DisputeStatus.FINALIZED }
                });

                // Update Audit Status based on final verdict
                const auditId = allItems[0].dispute.auditId;
                const anyFinalAccepted = allItems.some(i => i.finalVerdict === DisputeVerdict.ACCEPTED);
                const allFinalRejected = allItems
                    .filter(i => i.qaVerdict === DisputeVerdict.REJECTED)
                    .every(i => i.finalVerdict === DisputeVerdict.REJECTED);

                if (anyFinalAccepted || allItems.every(i => i.qaVerdict === DisputeVerdict.ACCEPTED)) {
                    // Finalized (Accepted) - Audit marked "Resolved" (RELEASED)
                    await tx.audit.update({
                        where: { id: auditId },
                        data: { status: AuditStatus.RELEASED }
                    });
                } else if (allFinalRejected) {
                    // Finalized (Rejected) - Audit marked "Not in Favor" (stays REAPPEALED)
                    // Audit status remains REAPPEALED to indicate coaching required
                    await tx.audit.update({
                        where: { id: auditId },
                        data: {
                            status: AuditStatus.REAPPEALED,
                            lastActionAt: new Date()
                        }
                    });
                }
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
