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
exports.FormsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
let FormsService = class FormsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const forms = await this.prisma.monitoringForm.findMany({
            where: { isArchived: false },
            include: {
                campaign: true,
                versions: {
                    where: { isActive: true },
                    include: {
                        creator: {
                            select: { name: true, email: true }
                        },
                        _count: {
                            select: {
                                audits: true,
                                criteria: true
                            }
                        }
                    },
                    take: 1
                },
                _count: {
                    select: { versions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const formsWithAuditStatus = await Promise.all(forms.map(async (form) => {
            const auditCount = await this.prisma.audit.count({
                where: {
                    formVersion: {
                        formId: form.id
                    }
                }
            });
            return {
                ...form,
                hasAudits: auditCount > 0
            };
        }));
        return formsWithAuditStatus;
    }
    async getDrafts() {
        return this.prisma.monitoringForm.findMany({
            where: {
                isConfigured: false,
                isArchived: false
            },
            include: {
                campaign: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findOne(id) {
        return this.prisma.monitoringForm.findUnique({
            where: { id },
            include: {
                campaign: true,
                versions: {
                    where: { isActive: true },
                    include: { criteria: true },
                    take: 1
                }
            }
        });
    }
    async create(data) {
        if (!data.name?.trim())
            throw new Error('Form name is required');
        let targetCampaignId = data.campaignId;
        if (!targetCampaignId && data.teamName) {
            const existingCampaign = await this.prisma.campaign.findFirst({
                where: { name: data.teamName, isActive: true }
            });
            if (existingCampaign) {
                targetCampaignId = existingCampaign.id;
            }
            else {
                const newCampaign = await this.prisma.campaign.create({
                    data: {
                        name: data.teamName,
                        type: 'USER',
                        isActive: true
                    }
                });
                targetCampaignId = newCampaign.id;
            }
        }
        if (targetCampaignId) {
            const existing = await this.prisma.monitoringForm.findFirst({
                where: { campaignId: targetCampaignId, isArchived: false }
            });
            if (existing) {
                throw new Error('A scorecard already exists for this configuration. Multiple forms per strategy are restricted.');
            }
        }
        return this.prisma.monitoringForm.create({
            data: {
                name: data.name,
                teamName: data.teamName,
                campaignId: targetCampaignId,
                description: data.description,
                isConfigured: false
            }
        });
    }
    async markConfigured(id) {
        return this.prisma.monitoringForm.update({
            where: { id },
            data: { isConfigured: true }
        });
    }
    async update(id, data) {
        return this.prisma.monitoringForm.update({
            where: { id },
            data
        });
    }
    async getVersions(formId) {
        return this.prisma.monitoringFormVersion.findMany({
            where: { formId },
            include: {
                creator: {
                    select: { name: true, email: true }
                },
                _count: {
                    select: { criteria: true, audits: true }
                }
            },
            orderBy: { versionNumber: 'desc' }
        });
    }
    async findActiveByCampaign(campaignId) {
        const campaign = await this.prisma.campaign.findUnique({
            where: { id: campaignId }
        });
        if (!campaign)
            return null;
        const form = await this.prisma.monitoringForm.findFirst({
            where: {
                OR: [
                    { campaignId },
                    { teamName: campaign.name, campaignId: null }
                ],
                isArchived: false
            },
            include: {
                campaign: true,
                versions: {
                    where: { isActive: true },
                    include: {
                        criteria: {
                            where: { isActive: true },
                            orderBy: { orderIndex: 'asc' }
                        }
                    },
                    take: 1,
                    orderBy: { versionNumber: 'desc' }
                }
            }
        });
        if (!form)
            return null;
        if (!form.campaign) {
            form.campaign = campaign;
        }
        return form;
    }
    async createVersion(formId, data, creatorId) {
        const last = await this.prisma.monitoringFormVersion.findFirst({
            where: { formId },
            orderBy: { versionNumber: 'desc' }
        });
        const nextVer = (last?.versionNumber || 0) + 1;
        return this.prisma.monitoringFormVersion.create({
            data: {
                formId,
                versionNumber: nextVer,
                isActive: false,
                isDraft: true,
                creatorId,
                changeLog: data.changeLog,
                categories: data.categories || [],
                criteria: {
                    create: (data.criteria || []).map((c) => ({
                        categoryId: c.categoryId,
                        categoryName: c.categoryName,
                        title: c.title,
                        description: c.description,
                        weight: c.weight,
                        isCritical: c.isCritical || false,
                        orderIndex: c.orderIndex
                    }))
                }
            }
        });
    }
    async publishVersion(versionId) {
        const version = await this.prisma.monitoringFormVersion.findUnique({ where: { id: versionId } });
        if (!version)
            throw new Error('Version not found');
        await this.prisma.monitoringFormVersion.updateMany({
            where: { formId: version.formId },
            data: { isActive: false }
        });
        return this.prisma.monitoringForm.update({
            where: { id: version.formId },
            data: {
                isConfigured: true,
                versions: {
                    update: {
                        where: { id: versionId },
                        data: { isActive: true, isDraft: false, publishedAt: new Date() }
                    }
                }
            }
        });
    }
    async archive(id) {
        return this.prisma.monitoringForm.update({
            where: { id },
            data: { isArchived: true }
        });
    }
    async remove(id) {
        const audits = await this.prisma.audit.findFirst({
            where: {
                formVersion: {
                    formId: id
                }
            }
        });
        if (audits) {
            throw new Error('Cannot delete form that has existing audits. Use archive instead.');
        }
        await this.prisma.formCriterion.deleteMany({
            where: {
                formVersion: {
                    formId: id
                }
            }
        });
        await this.prisma.monitoringFormVersion.deleteMany({
            where: { formId: id }
        });
        return this.prisma.monitoringForm.delete({
            where: { id }
        });
    }
    async findByCampaignOrTeam(campaignId, teamName) {
        return this.prisma.monitoringForm.findMany({
            where: {
                isArchived: false,
                isConfigured: true,
                OR: [
                    { campaignId: campaignId || undefined },
                    { teamName: teamName || undefined }
                ]
            },
            include: {
                versions: {
                    where: { isActive: true },
                    include: {
                        _count: {
                            select: { criteria: true }
                        }
                    },
                    take: 1
                }
            }
        });
    }
    async duplicate(sourceFormId, data, creatorId) {
        console.log('Duplicating form:', { sourceFormId, data, creatorId });
        try {
            const sourceForm = await this.prisma.monitoringForm.findUnique({
                where: { id: sourceFormId },
                include: {
                    versions: {
                        where: { isActive: true },
                        include: { criteria: true },
                        take: 1,
                        orderBy: { versionNumber: 'desc' }
                    }
                }
            });
            if (!sourceForm)
                throw new common_1.BadRequestException('Source form not found');
            console.log('Source form found:', sourceForm.name);
            const sourceVersion = sourceForm.versions[0];
            if (!sourceVersion) {
                console.log('No active version found, fetching latest draft...');
                const latestVersion = await this.prisma.monitoringFormVersion.findFirst({
                    where: { formId: sourceFormId },
                    include: { criteria: true },
                    orderBy: { versionNumber: 'desc' }
                });
                if (!latestVersion)
                    throw new common_1.BadRequestException('Source form has no structure/versions to duplicate');
                return this.performDuplicate(sourceForm, latestVersion, data, creatorId);
            }
            return this.performDuplicate(sourceForm, sourceVersion, data, creatorId);
        }
        catch (error) {
            console.error('Duplicate failed:', error);
            throw error;
        }
    }
    async performDuplicate(sourceForm, sourceVersion, data, creatorId) {
        console.log('Performing duplicate with version:', sourceVersion.versionNumber);
        if (data.campaignId) {
            const existing = await this.prisma.monitoringForm.findFirst({
                where: { campaignId: data.campaignId, isArchived: false }
            });
            if (existing) {
                throw new common_1.BadRequestException('A scorecard already exists for the selected campaign.');
            }
        }
        else if (data.teamName) {
            const existing = await this.prisma.monitoringForm.findFirst({
                where: { teamName: data.teamName, campaignId: null, isArchived: false }
            });
            if (existing) {
                throw new common_1.BadRequestException('A scorecard already exists for the selected team.');
            }
        }
        const newForm = await this.prisma.monitoringForm.create({
            data: {
                name: data.name,
                campaignId: data.campaignId || null,
                teamName: data.teamName || sourceForm.teamName,
                isConfigured: true,
                description: `Duplicated from ${sourceForm.name}`
            }
        });
        console.log('New form created:', newForm.id);
        const newVersion = await this.prisma.monitoringFormVersion.create({
            data: {
                formId: newForm.id,
                versionNumber: 1,
                isActive: true,
                isDraft: false,
                creatorId,
                publishedAt: new Date(),
                categories: sourceVersion.categories || [],
                criteria: {
                    create: (sourceVersion.criteria || []).map((c) => ({
                        categoryId: c.categoryId,
                        categoryName: c.categoryName,
                        title: c.title,
                        description: c.description,
                        weight: c.weight,
                        isCritical: c.isCritical || false,
                        orderIndex: c.orderIndex
                    }))
                }
            }
        });
        console.log('New version created:', newVersion.id);
        return { form: newForm, version: newVersion };
    }
};
exports.FormsService = FormsService;
exports.FormsService = FormsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FormsService);
//# sourceMappingURL=forms.service.js.map