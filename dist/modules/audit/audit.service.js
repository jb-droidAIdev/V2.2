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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const client_1 = require("@prisma/client");
let AuditService = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getActiveAudit(auditorId) {
        const audit = await this.prisma.audit.findFirst({
            where: {
                auditorId,
                status: client_1.AuditStatus.IN_PROGRESS,
            },
            include: {
                formVersion: {
                    include: { criteria: true }
                },
                fieldValues: true,
                scores: true,
                agent: {
                    select: {
                        id: true,
                        name: true,
                        eid: true,
                        employeeTeam: true,
                        supervisor: true,
                        manager: true,
                        sdm: true
                    }
                }
            }
        });
        return audit;
    }
    calculateScore(criteria, currentScores) {
        let totalPossible = 0;
        let totalEarned = 0;
        let isAutoFailed = false;
        const scoreMap = new Map(currentScores.map(s => [s.criterionId, s]));
        criteria.forEach((criterion) => {
            const scoreObj = scoreMap.get(criterion.id);
            if (scoreObj) {
                if (scoreObj.score === -1) {
                    return;
                }
                totalPossible += criterion.weight;
                totalEarned += scoreObj.score;
                if (criterion.isCritical && scoreObj.isFailed) {
                    isAutoFailed = true;
                }
            }
        });
        const percent = totalPossible > 0
            ? Math.round((totalEarned / totalPossible) * 100)
            : 0;
        return {
            percent: isAutoFailed ? 0 : percent,
            isAutoFailed,
            totalEarned,
            totalPossible
        };
    }
    async findAll(user) {
        let where = {};
        const role = String(user.role || '').toUpperCase();
        const isStaff = role !== 'AGENT';
        if (role === 'AGENT') {
            where.agentId = user.id;
            where.status = { in: [client_1.AuditStatus.RELEASED, client_1.AuditStatus.DISPUTED, client_1.AuditStatus.REAPPEALED] };
        }
        else if (['QA_TL', 'QATL', 'OPS_TL', 'OPSTL', 'OPS_MANAGER', 'OPSMANAGER', 'SDM', 'QA'].includes(role)) {
            const assignments = await this.prisma.campaignQA.findMany({
                where: { userId: user.id, isActive: true },
                select: { campaignId: true }
            });
            const assignedIds = assignments.map(a => a.campaignId);
            where.campaignId = { in: assignedIds };
        }
        else if (!isStaff) {
            where.agent = { ...where.agent, employeeTeam: user.employeeTeam };
        }
        const audits = await this.prisma.audit.findMany({
            where,
            include: {
                agent: {
                    select: { name: true, eid: true, email: true }
                },
                auditor: {
                    select: { name: true, eid: true }
                },
                campaign: {
                    select: { name: true }
                },
                formVersion: {
                    include: {
                        form: {
                            select: { name: true }
                        }
                    }
                },
                sampledTicket: {
                    include: { ticket: true }
                },
                userViews: {
                    where: { userId: user.id }
                }
            },
            orderBy: { lastActionAt: 'desc' }
        });
        return audits.map(audit => {
            const lastView = audit.userViews?.[0];
            const isUnread = !lastView || new Date(lastView.viewedAt) < new Date(audit.lastActionAt);
            return { ...audit, isUnread };
        });
    }
    async getFailures(user, filters = {}) {
        let where = {
            status: { in: [client_1.AuditStatus.SUBMITTED, client_1.AuditStatus.RELEASED, client_1.AuditStatus.DISPUTED, client_1.AuditStatus.REAPPEALED] }
        };
        if (filters.campaignId) {
            const campaignIds = Array.isArray(filters.campaignId)
                ? filters.campaignId
                : String(filters.campaignId).split(',').filter(Boolean);
            if (campaignIds.length > 0) {
                const teamNames = campaignIds
                    .filter((id) => id.startsWith('TEAM:'))
                    .map((id) => id.replace('TEAM:', ''));
                const realCampaignIds = campaignIds.filter((id) => !id.startsWith('TEAM:'));
                let campaignConditions = [];
                if (realCampaignIds.length > 0) {
                    campaignConditions.push({ campaignId: { in: realCampaignIds } });
                }
                if (teamNames.length > 0) {
                    campaignConditions.push({ agent: { employeeTeam: { in: teamNames } } });
                }
                if (campaignConditions.length > 1) {
                    where.OR = campaignConditions;
                }
                else if (campaignConditions.length === 1) {
                    const cond = campaignConditions[0];
                    if (cond.campaignId)
                        where.campaignId = cond.campaignId;
                    if (cond.agent)
                        where.agent = { ...where.agent, ...cond.agent };
                }
            }
        }
        if (filters.startDate || filters.endDate) {
            where.submittedAt = {};
            if (filters.startDate)
                where.submittedAt.gte = new Date(filters.startDate);
            if (filters.endDate) {
                const ed = new Date(filters.endDate);
                ed.setHours(23, 59, 59, 999);
                where.submittedAt.lte = ed;
            }
        }
        const role = String(user.role || '').toUpperCase();
        const isStaff = role !== 'AGENT';
        const restrictedRoles = ['QA_TL', 'QATL', 'OPS_TL', 'OPSTL', 'OPS_MANAGER', 'OPSMANAGER', 'SDM', 'QA'];
        if (role === 'AGENT') {
            where.agentId = user.id;
            where.status = { in: [client_1.AuditStatus.RELEASED, client_1.AuditStatus.DISPUTED, client_1.AuditStatus.REAPPEALED] };
        }
        else if (restrictedRoles.includes(role)) {
            const userAssignments = await this.prisma.campaignQA.findMany({
                where: { userId: user.id, isActive: true },
                select: { campaignId: true }
            });
            const assignedIds = userAssignments.map(a => a.campaignId);
            if (where.campaignId && where.campaignId.in) {
                const requested = where.campaignId.in;
                const intersected = requested.filter((id) => assignedIds.includes(id));
                if (intersected.length === 0)
                    return [];
                where.campaignId = { in: intersected };
            }
            else {
                where.campaignId = { in: assignedIds };
            }
        }
        else if (!isStaff) {
            where.agent = {
                ...where.agent,
                employeeTeam: user.employeeTeam
            };
        }
        return this.prisma.audit.findMany({
            where: {
                ...where,
                scores: {
                    some: {
                        isFailed: true
                    }
                }
            },
            take: 200,
            orderBy: { submittedAt: 'desc' },
            include: {
                agent: { select: { name: true, employeeTeam: true } },
                campaign: { select: { name: true } },
                sampledTicket: {
                    include: {
                        ticket: { select: { externalTicketId: true } }
                    }
                },
                scores: {
                    where: { isFailed: true },
                    select: {
                        comment: true,
                        criterion: {
                            select: {
                                title: true,
                                categoryName: true
                            }
                        }
                    }
                }
            }
        });
    }
    async startAudit(sampledTicketId, auditorId, formVersionId, campaignId) {
        const activeAudits = await this.prisma.audit.count({
            where: {
                auditorId,
                status: client_1.AuditStatus.IN_PROGRESS,
            },
        });
        if (activeAudits > 0) {
            throw new common_1.BadRequestException('You already have an audit in progress. Please finish or submit it before starting a new one.');
        }
        const ticket = await this.prisma.sampledTicket.findUnique({
            where: { id: sampledTicketId },
            include: { ticket: true }
        });
        if (!ticket)
            throw new common_1.BadRequestException('Ticket not found');
        return await this.prisma.audit.create({
            data: {
                campaignId,
                sampledTicketId,
                formVersionId,
                auditorId,
                agentId: ticket.ticket.agentId,
                status: client_1.AuditStatus.IN_PROGRESS,
            },
        });
    }
    async createManualAudit(data) {
        const sanitizedReference = data.ticketReference?.trim();
        if (sanitizedReference) {
            const conflict = await this.prisma.audit.findFirst({
                where: {
                    ticketReference: { equals: sanitizedReference, mode: 'insensitive' }
                },
                include: { campaign: true }
            });
            if (conflict) {
                const completedStatuses = [
                    client_1.AuditStatus.RELEASED,
                    client_1.AuditStatus.SUBMITTED,
                    client_1.AuditStatus.DISPUTED,
                    client_1.AuditStatus.REAPPEALED
                ];
                if (completedStatuses.includes(conflict.status)) {
                    throw new common_1.BadRequestException(`Ticket "${sanitizedReference}" has already been audited in the "${conflict.campaign?.name}" campaign.`);
                }
                if (conflict.auditorId === data.auditorId &&
                    conflict.status === client_1.AuditStatus.IN_PROGRESS &&
                    conflict.campaignId === data.campaignId) {
                    return this.prisma.audit.findUnique({
                        where: { id: conflict.id },
                        include: {
                            formVersion: { include: { criteria: true } },
                            agent: {
                                select: {
                                    id: true, name: true, eid: true,
                                    employeeTeam: true, supervisor: true,
                                    manager: true, sdm: true
                                }
                            }
                        }
                    });
                }
                throw new common_1.BadRequestException(`Ticket "${sanitizedReference}" is currently being audited in the "${conflict.campaign?.name}" campaign.`);
            }
        }
        const existingAudit = await this.prisma.audit.findFirst({
            where: {
                auditorId: data.auditorId,
                status: client_1.AuditStatus.IN_PROGRESS,
            },
            include: {
                formVersion: {
                    include: { criteria: true }
                },
                agent: {
                    select: {
                        id: true,
                        name: true,
                        eid: true,
                        employeeTeam: true,
                        supervisor: true,
                        manager: true,
                        sdm: true
                    }
                }
            }
        });
        if (existingAudit) {
            if (existingAudit.campaignId === data.campaignId &&
                existingAudit.agentId === data.agentId &&
                existingAudit.ticketReference === sanitizedReference) {
                return existingAudit;
            }
            const [scoreCount, fieldCount] = await Promise.all([
                this.prisma.auditScore.count({ where: { auditId: existingAudit.id } }),
                this.prisma.auditFieldValue.count({ where: { auditId: existingAudit.id } })
            ]);
            if (scoreCount === 0 && fieldCount === 0) {
                const targetCampaign = await this.prisma.campaign.findUnique({
                    where: { id: data.campaignId }
                });
                const activeForm = await this.prisma.monitoringForm.findFirst({
                    where: {
                        OR: [
                            { campaignId: data.campaignId },
                            { teamName: targetCampaign?.name, campaignId: null }
                        ],
                        isArchived: false
                    },
                    include: {
                        versions: { where: { isActive: true }, take: 1 }
                    }
                });
                if (activeForm && activeForm.versions[0]) {
                    const newFormVersionId = activeForm.versions[0].id;
                    return await this.prisma.audit.update({
                        where: { id: existingAudit.id },
                        data: {
                            campaignId: data.campaignId,
                            agentId: data.agentId,
                            formVersionId: newFormVersionId,
                            ticketReference: sanitizedReference
                        },
                        include: {
                            formVersion: { include: { criteria: true } },
                            agent: {
                                select: {
                                    id: true, name: true, eid: true,
                                    employeeTeam: true, supervisor: true,
                                    manager: true, sdm: true
                                }
                            }
                        }
                    });
                }
            }
            const campaignInfo = await this.prisma.campaign.findUnique({ where: { id: existingAudit.campaignId }, select: { name: true } });
            throw new common_1.BadRequestException(`Active session detected: You are currently auditing Ticket "${existingAudit.ticketReference || 'Unknown'}" in "${campaignInfo?.name || 'Another Campaign'}". Please finalize or submit it before starting a new session.`);
        }
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: data.campaignId }
        });
        const activeForm = await this.prisma.monitoringForm.findFirst({
            where: {
                OR: [
                    { campaignId: data.campaignId },
                    { teamName: campaign?.name, campaignId: null }
                ],
                isArchived: false
            },
            include: {
                versions: {
                    where: { isActive: true },
                    take: 1
                }
            }
        });
        if (!activeForm || !activeForm.versions[0]) {
            throw new common_1.BadRequestException('No active scorecard found for this campaign.');
        }
        const formVersionId = activeForm.versions[0].id;
        return await this.prisma.audit.create({
            data: {
                campaignId: data.campaignId,
                formVersionId,
                auditorId: data.auditorId,
                agentId: data.agentId,
                ticketReference: sanitizedReference,
                status: client_1.AuditStatus.IN_PROGRESS,
            },
            include: {
                formVersion: {
                    include: { criteria: true }
                },
                agent: {
                    select: {
                        id: true,
                        name: true,
                        eid: true,
                        employeeTeam: true,
                        supervisor: true,
                        manager: true,
                        sdm: true
                    }
                }
            }
        });
    }
    async findOne(id, userId) {
        if (userId) {
            await this.prisma.auditUserView.upsert({
                where: { auditId_userId: { auditId: id, userId } },
                create: { auditId: id, userId },
                update: { viewedAt: new Date() }
            });
        }
        const audit = await this.prisma.audit.findUnique({
            where: { id },
            include: {
                formVersion: {
                    include: { criteria: true }
                },
                fieldValues: true,
                scores: {
                    include: { criterion: true }
                },
                agent: {
                    select: { name: true, eid: true, employeeTeam: true }
                },
                auditor: {
                    select: { name: true, eid: true }
                },
                campaign: {
                    select: { name: true }
                },
                sampledTicket: {
                    include: { ticket: true }
                }
            }
        });
        if (!audit)
            throw new common_1.NotFoundException('Audit not found');
        const enrichedScores = await Promise.all(audit.scores.map(async (score) => {
            if (!score.isFailed || !audit.submittedAt)
                return { ...score, reachedMilestone: null };
            const category = (score.categoryLabel || score.criterion?.categoryName || 'General').trim();
            const auditDate = new Date(audit.submittedAt);
            const windowStart = new Date(auditDate);
            windowStart.setDate(windowStart.getDate() - 30);
            const count = await this.prisma.auditScore.count({
                where: {
                    isFailed: true,
                    categoryLabel: category,
                    audit: {
                        agentId: audit.agentId,
                        submittedAt: {
                            gte: windowStart,
                            lte: auditDate
                        }
                    }
                }
            });
            const milestones = [3, 6, 9, 12, 15];
            const reachedMilestone = milestones.includes(count) ? count : null;
            return { ...score, reachedMilestone };
        }));
        return { ...audit, scores: enrichedScores };
    }
    async autosave(id, auditorId, data) {
        const audit = await this.prisma.audit.findUnique({
            where: { id },
            include: { formVersion: { include: { criteria: true } } }
        });
        if (!audit)
            throw new common_1.NotFoundException('Audit not found');
        const requestingUser = await this.prisma.user.findUnique({ where: { id: auditorId } });
        if (audit.auditorId !== auditorId && requestingUser?.role !== 'ADMIN') {
            throw new common_1.ForbiddenException('Not the owner of this audit session');
        }
        if (data.fieldValues) {
            await Promise.all(Object.entries(data.fieldValues).map(([key, value]) => this.prisma.auditFieldValue.upsert({
                where: { auditId_fieldName: { auditId: id, fieldName: key } },
                create: { auditId: id, fieldName: key, value },
                update: { value }
            })));
        }
        if (data.scores) {
            await Promise.all(data.scores.map(item => {
                const criterion = audit.formVersion.criteria.find(c => c.id === item.criterionId);
                return this.prisma.auditScore.upsert({
                    where: { auditId_criterionId: { auditId: id, criterionId: item.criterionId } },
                    create: {
                        auditId: id,
                        criterionId: item.criterionId,
                        score: item.score,
                        comment: item.comment,
                        isFailed: item.isFailed || false,
                        categoryLabel: criterion?.categoryName,
                        criterionTitle: criterion?.title
                    },
                    update: {
                        score: item.score,
                        comment: item.comment,
                        isFailed: item.isFailed,
                        categoryLabel: criterion?.categoryName,
                        criterionTitle: criterion?.title
                    }
                });
            }));
        }
        const allScores = await this.prisma.auditScore.findMany({ where: { auditId: id } });
        const { percent, isAutoFailed } = this.calculateScore(audit.formVersion.criteria, allScores);
        await this.prisma.audit.update({
            where: { id },
            data: {
                score: percent,
                isAutoFailed,
                lastActionAt: new Date()
            }
        });
        return { status: 'saved', score: percent };
    }
    async submit(id, auditorId) {
        const audit = await this.prisma.audit.findUnique({
            where: { id },
            include: {
                scores: true,
                formVersion: {
                    include: { criteria: true }
                }
            }
        });
        if (!audit)
            throw new common_1.NotFoundException('Audit not found');
        const requestingUser = await this.prisma.user.findUnique({ where: { id: auditorId } });
        if (audit.auditorId !== auditorId && requestingUser?.role !== 'ADMIN') {
            throw new common_1.ForbiddenException('Not the owner of this audit session');
        }
        const dbScores = await this.prisma.auditScore.findMany({
            where: { auditId: id },
            include: { criterion: true }
        });
        const scoredCriteriaIds = new Set(dbScores.map(s => s.criterionId));
        if (scoredCriteriaIds.size !== audit.formVersion.criteria.length) {
            throw new common_1.BadRequestException(`Audit is incomplete. Scored ${scoredCriteriaIds.size} out of ${audit.formVersion.criteria.length} items.`);
        }
        const failedScoresWithoutRemarks = dbScores.filter(s => {
            const hasValidComment = s.comment && s.comment.trim().length >= 10;
            return s.isFailed && !hasValidComment;
        });
        if (failedScoresWithoutRemarks.length > 0) {
            const names = failedScoresWithoutRemarks.map(s => s.criterion?.title || s.criterionId).join(', ');
            throw new common_1.BadRequestException(`Detailed remarks required for failed items: ${names}`);
        }
        const { percent, isAutoFailed } = this.calculateScore(audit.formVersion.criteria, dbScores);
        await Promise.all(dbScores.map(score => {
            if (!score.categoryLabel || !score.criterionTitle) {
                return this.prisma.auditScore.update({
                    where: { id: score.id },
                    data: {
                        categoryLabel: score.criterion?.categoryName,
                        criterionTitle: score.criterion?.title
                    }
                });
            }
        }));
        const now = new Date();
        const deadline = new Date(now);
        deadline.setDate(deadline.getDate() + 2);
        return this.prisma.audit.update({
            where: { id },
            data: {
                status: client_1.AuditStatus.RELEASED,
                submittedAt: now,
                releasedAt: now,
                agentAckDeadline: deadline,
                score: percent,
                isAutoFailed,
                lastActionAt: now
            }
        });
    }
    async getQueue(auditorId) {
        return this.prisma.sampledTicket.findMany({
            where: {
                assignedQaId: auditorId,
                status: 'READY'
            },
            include: {
                ticket: true
            }
        });
    }
    async remove(id) {
        await this.prisma.auditScore.deleteMany({ where: { auditId: id } });
        await this.prisma.auditFieldValue.deleteMany({ where: { auditId: id } });
        return this.prisma.audit.delete({
            where: { id }
        });
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map