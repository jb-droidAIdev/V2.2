"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const client_1 = require("@prisma/client");
const audit_service_1 = require("../audit/audit.service");
const date_fns_1 = require("date-fns");
let DisputeService = class DisputeService {
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async createDispute(auditId, userId, data) {
        const audit = await this.prisma.audit.findUnique({
            where: { id: auditId },
            include: { dispute: true }
        });
        if (!audit)
            throw new common_1.NotFoundException('Audit not found');
        if (audit.dispute)
            throw new common_1.BadRequestException('Dispute already exists for this audit');
        const lastActionAt = audit.submittedAt || audit.startedAt;
        const daysDiff = (0, date_fns_1.differenceInBusinessDays)(new Date(), new Date(lastActionAt));
        if (daysDiff > 5)
            throw new common_1.BadRequestException('Dispute must be filed within 5 business days');
        if (!data.items || data.items.length === 0)
            throw new common_1.BadRequestException('No parameters selected for dispute');
        data.items.forEach(item => {
            if (item.reason.length < 30) {
                throw new common_1.BadRequestException(`Reason for parameter challenge must be at least 30 characters`);
            }
        });
        return this.prisma.$transaction(async (tx) => {
            await tx.audit.update({
                where: { id: auditId },
                data: { status: client_1.AuditStatus.DISPUTED }
            });
            return tx.dispute.create({
                data: {
                    auditId,
                    raisedById: userId,
                    status: client_1.DisputeStatus.PENDING_QA_REVIEW,
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
    async qaVerdict(disputeId, auditorId, itemId, data) {
        const item = await this.prisma.disputeItem.findUnique({
            where: { id: itemId },
            include: { dispute: { include: { audit: true } } }
        });
        if (!item)
            throw new common_1.NotFoundException('Dispute item not found');
        const user = await this.prisma.user.findUnique({ where: { id: auditorId } });
        const isAdmin = user?.role === 'ADMIN';
        if (item.dispute.audit.auditorId !== auditorId && !isAdmin) {
            throw new common_1.ForbiddenException('Only the original QA or an Admin can provide the first verdict');
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
            if (data.verdict === client_1.DisputeVerdict.ACCEPTED) {
                await this.applyCorrection(tx, item.dispute.auditId, item.criterionId);
            }
            const allItems = await tx.disputeItem.findMany({
                where: { disputeId },
                include: { dispute: true }
            });
            const allReviewed = allItems.every(i => !!i.qaVerdict);
            if (allReviewed) {
                const anyRejected = allItems.some(i => i.qaVerdict === client_1.DisputeVerdict.REJECTED);
                const allAccepted = allItems.every(i => i.qaVerdict === client_1.DisputeVerdict.ACCEPTED);
                await tx.dispute.update({
                    where: { id: disputeId },
                    data: { status: anyRejected ? client_1.DisputeStatus.QA_REJECTED : client_1.DisputeStatus.FINALIZED }
                });
                const auditId = allItems[0].dispute.auditId;
                if (allAccepted) {
                    await tx.audit.update({
                        where: { id: auditId },
                        data: { status: client_1.AuditStatus.RELEASED }
                    });
                }
            }
            return updatedItem;
        });
    }
    async reappeal(disputeId, userId, data) {
        const dispute = await this.prisma.dispute.findUnique({
            where: { id: disputeId },
            include: { items: true, audit: true }
        });
        if (!dispute)
            throw new common_1.NotFoundException('Dispute not found');
        if (dispute.status !== client_1.DisputeStatus.QA_REJECTED)
            throw new common_1.BadRequestException('Can only re-appeal after QA rejection');
        if (data.reappealReason.length < 30)
            throw new common_1.BadRequestException('Reason must be at least 30 characters');
        const lastQaReview = Math.max(...dispute.items.map(i => i.qaReviewedAt?.getTime() || 0));
        const daysDiff = (0, date_fns_1.differenceInBusinessDays)(new Date(), new Date(lastQaReview));
        if (daysDiff > 3)
            throw new common_1.BadRequestException('Re-appeal must be filed within 3 business days');
        return this.prisma.$transaction(async (tx) => {
            await tx.audit.update({
                where: { id: dispute.auditId },
                data: { status: client_1.AuditStatus.REAPPEALED }
            });
            await tx.dispute.update({
                where: { id: disputeId },
                data: { status: client_1.DisputeStatus.REAPPEALED }
            });
            const rejectedItems = dispute.items.filter(i => i.qaVerdict === client_1.DisputeVerdict.REJECTED);
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
    async finalVerdict(disputeId, adminId, itemId, data) {
        const item = await this.prisma.disputeItem.findUnique({
            where: { id: itemId },
            include: { dispute: { include: { audit: true } } }
        });
        if (!item)
            throw new common_1.NotFoundException('Item not found');
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
            if (data.verdict === client_1.DisputeVerdict.ACCEPTED) {
                await this.applyCorrection(tx, item.dispute.auditId, item.criterionId);
            }
            const allItems = await tx.disputeItem.findMany({
                where: { disputeId },
                include: { dispute: true }
            });
            const allDone = allItems.every(i => (i.qaVerdict === client_1.DisputeVerdict.ACCEPTED) || !!i.finalVerdict);
            if (allDone) {
                await tx.dispute.update({
                    where: { id: disputeId },
                    data: { status: client_1.DisputeStatus.FINALIZED }
                });
                const auditId = allItems[0].dispute.auditId;
                const anyFinalAccepted = allItems.some(i => i.finalVerdict === client_1.DisputeVerdict.ACCEPTED);
                const allFinalRejected = allItems
                    .filter(i => i.qaVerdict === client_1.DisputeVerdict.REJECTED)
                    .every(i => i.finalVerdict === client_1.DisputeVerdict.REJECTED);
                if (anyFinalAccepted || allItems.every(i => i.qaVerdict === client_1.DisputeVerdict.ACCEPTED)) {
                    await tx.audit.update({
                        where: { id: auditId },
                        data: { status: client_1.AuditStatus.RELEASED }
                    });
                }
                else if (allFinalRejected) {
                    await tx.audit.update({
                        where: { id: auditId },
                        data: { status: client_1.AuditStatus.REAPPEALED }
                    });
                }
            }
            return updatedItem;
        });
    }
    async applyCorrection(tx, auditId, criterionId) {
        const criterion = await tx.formCriterion.findUnique({ where: { id: criterionId } });
        await tx.auditScore.updateMany({
            where: { auditId, criterionId },
            data: { score: criterion.weight, isFailed: false }
        });
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
    async findByAudit(auditId) {
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
};
exports.DisputeService = DisputeService;
exports.DisputeService = DisputeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], DisputeService);
//# sourceMappingURL=dispute.service.js.map