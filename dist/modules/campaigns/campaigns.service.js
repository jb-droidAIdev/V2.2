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
exports.CampaignsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let CampaignsService = class CampaignsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(user) {
        let where = { isActive: true };
        if (user) {
            const role = String(user.role || '').toUpperCase();
            const isSuperAdmin = ['ADMIN', 'QA_MANAGER'].includes(role);
            if (!isSuperAdmin) {
                where.OR = [
                    { qaAssignments: { some: { userId: user.id } } },
                    { type: 'ADMIN' }
                ];
            }
        }
        return this.prisma.campaign.findMany({
            where,
            include: {
                _count: {
                    select: { qaAssignments: true, forms: true }
                }
            }
        });
    }
    async findAssigned(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, name: true, employeeTeam: true }
        });
        const isSuperAdmin = user && ['ADMIN', 'QA_MANAGER'].includes(user.role);
        const activeForms = await this.prisma.monitoringForm.findMany({
            where: {
                isArchived: false,
                versions: { some: { isActive: true } }
            },
            select: { id: true, campaignId: true, teamName: true }
        });
        const activeCampaignIds = new Set(activeForms.map(f => f.campaignId).filter(Boolean));
        const activeTeamNames = new Set(activeForms.map(f => f.teamName).filter(Boolean));
        let campaigns;
        if (isSuperAdmin) {
            campaigns = await this.prisma.campaign.findMany({
                where: { isActive: true },
                select: { id: true, name: true, type: true }
            });
        }
        else {
            campaigns = await this.prisma.campaign.findMany({
                where: {
                    isActive: true,
                    qaAssignments: { some: { userId } }
                },
                select: { id: true, name: true, type: true }
            });
        }
        return campaigns.filter(campaign => {
            const hasActiveForm = activeCampaignIds.has(campaign.id) || activeTeamNames.has(campaign.name);
            const isUserCampaign = campaign.type !== 'ADMIN';
            return hasActiveForm && isUserCampaign;
        });
    }
    async findOneDetail(id) {
        return this.prisma.campaign.findUnique({
            where: { id },
            include: {
                qaAssignments: {
                    include: { user: true }
                },
                forms: {
                    include: {
                        _count: {
                            select: { versions: true }
                        }
                    }
                },
                _count: {
                    select: { forms: true }
                }
            }
        });
    }
    async create(data) {
        const existing = await this.prisma.campaign.findFirst({
            where: { name: data.name, isActive: true }
        });
        if (existing) {
            throw new Error(`A configuration for team "${data.name}" already exists.`);
        }
        const { assignedUserIds, ...campaignData } = data;
        return this.prisma.campaign.create({
            data: {
                ...campaignData,
                qaAssignments: {
                    create: (assignedUserIds || []).map(userId => ({
                        userId
                    }))
                }
            },
            include: {
                qaAssignments: true
            }
        });
    }
    async update(id, data) {
        const { assignedUserIds, ...updateData } = data;
        if (assignedUserIds) {
            await this.prisma.campaignQA.deleteMany({
                where: { campaignId: id }
            });
            if (assignedUserIds.length > 0) {
                await this.prisma.campaignQA.createMany({
                    data: assignedUserIds.map(userId => ({
                        campaignId: id,
                        userId
                    }))
                });
            }
        }
        return this.prisma.campaign.update({
            where: { id },
            data: updateData
        });
    }
    async remove(id) {
        return this.prisma.$transaction(async (tx) => {
            await tx.campaignQA.deleteMany({ where: { campaignId: id } });
            const formVersions = await tx.monitoringFormVersion.findMany({
                where: { form: { campaignId: id } },
                select: { id: true }
            });
            const formVersionIds = formVersions.map(fv => fv.id);
            const audits = await tx.audit.findMany({
                where: {
                    OR: [
                        { campaignId: id },
                        { formVersionId: { in: formVersionIds } }
                    ]
                },
                select: { id: true }
            });
            const auditIds = audits.map(a => a.id);
            if (auditIds.length > 0) {
                await tx.auditFieldValue.deleteMany({ where: { auditId: { in: auditIds } } });
                await tx.auditScore.deleteMany({ where: { auditId: { in: auditIds } } });
                await tx.auditEvent.deleteMany({ where: { auditId: { in: auditIds } } });
                await tx.releaseRecord.deleteMany({ where: { auditId: { in: auditIds } } });
                const disputes = await tx.dispute.findMany({ where: { auditId: { in: auditIds } }, select: { id: true } });
                const disputeIds = disputes.map(d => d.id);
                if (disputeIds.length > 0) {
                    await tx.disputeItem.deleteMany({ where: { disputeId: { in: disputeIds } } });
                    await tx.dispute.deleteMany({ where: { id: { in: disputeIds } } });
                }
                await tx.audit.deleteMany({ where: { id: { in: auditIds } } });
            }
            const runs = await tx.samplingRun.findMany({ where: { campaignId: id }, select: { id: true } });
            const runIds = runs.map(r => r.id);
            if (runIds.length > 0) {
                await tx.sampledTicket.deleteMany({ where: { runId: { in: runIds } } });
                await tx.samplingRun.deleteMany({ where: { id: { in: runIds } } });
            }
            const batches = await tx.ticketUploadBatch.findMany({ where: { campaignId: id }, select: { id: true } });
            const batchIds = batches.map(b => b.id);
            await tx.uploadedTicket.deleteMany({
                where: {
                    OR: [
                        { campaignId: id },
                        { batchId: { in: batchIds } }
                    ]
                }
            });
            await tx.ticketUploadBatch.deleteMany({ where: { campaignId: id } });
            const forms = await tx.monitoringForm.findMany({ where: { campaignId: id }, select: { id: true } });
            const formIds = forms.map(f => f.id);
            if (formIds.length > 0) {
                const versions = await tx.monitoringFormVersion.findMany({ where: { formId: { in: formIds } }, select: { id: true } });
                const versionIds = versions.map(v => v.id);
                if (versionIds.length > 0) {
                    await tx.formCriterion.deleteMany({ where: { formVersionId: { in: versionIds } } });
                    await tx.monitoringFormVersion.deleteMany({ where: { id: { in: versionIds } } });
                }
                await tx.monitoringForm.deleteMany({ where: { id: { in: formIds } } });
            }
            return tx.campaign.delete({ where: { id } });
        });
    }
    async assignQa(campaignId, userId) {
        return this.prisma.campaignQA.create({
            data: {
                campaignId,
                userId
            }
        });
    }
};
exports.CampaignsService = CampaignsService;
exports.CampaignsService = CampaignsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CampaignsService);
//# sourceMappingURL=campaigns.service.js.map