import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Campaign } from '@prisma/client';

@Injectable()
export class CampaignsService {
    constructor(private prisma: PrismaService) { }

    async findAll(user?: any) {
        let where: any = { isActive: true };

        if (user) {
            const role = String(user.role || '').toUpperCase();
            const isSuperAdmin = ['ADMIN', 'QA_MANAGER'].includes(role);

            if (!isSuperAdmin) {
                // Restricted managers see their assignments + ADMIN folders
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

    async findAssigned(userId: string) {
        // Check if user is admin or above
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, name: true, employeeTeam: true }
        });

        // ADMIN and QA_MANAGER still see everything. 
        // QA_TL, OPS_TL, OPS_MANAGER, SDM are now restricted to their assignments per user request.
        const isSuperAdmin = user && ['ADMIN', 'QA_MANAGER'].includes(user.role);

        // 1. Get all active forms first - they are the "Source of Truth" for what can be audited
        const activeForms = await this.prisma.monitoringForm.findMany({
            where: {
                isArchived: false,
                versions: { some: { isActive: true } }
            },
            select: { id: true, campaignId: true, teamName: true }
        });

        const activeCampaignIds = new Set(activeForms.map(f => f.campaignId).filter(Boolean));
        const activeTeamNames = new Set(activeForms.map(f => f.teamName).filter(Boolean));

        // 2. Define campaign visibility
        let campaigns;
        if (isSuperAdmin) {
            // Super Admins see all campaigns that ARE evaluate-able
            campaigns = await this.prisma.campaign.findMany({
                where: { isActive: true },
                select: { id: true, name: true, type: true }
            });
        } else {
            // Regular QAs and restricted Managers only see active campaigns they are explicitly assigned to
            campaigns = await this.prisma.campaign.findMany({
                where: {
                    isActive: true,
                    qaAssignments: { some: { userId } }
                },
                select: { id: true, name: true, type: true }
            });
        }

        // 3. Final Filter: Only return campaigns that have an active form (via ID or Team Name)
        // AND are of type USER (not ADMIN organizational folders)
        return campaigns.filter(campaign => {
            const hasActiveForm = activeCampaignIds.has(campaign.id) || activeTeamNames.has(campaign.name);
            const isUserCampaign = (campaign as any).type !== 'ADMIN';
            return hasActiveForm && isUserCampaign;
        });
    }

    async findOneDetail(id: string) {
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

    async create(data: { name: string; type?: any, samplingRate?: number; stratification?: any, assignedUserIds?: string[] }) {
        // Uniqueness check: One configuration per team/name
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

    async update(id: string, data: { name?: string; samplingRate?: number; stratification?: any, assignedUserIds?: string[] }) {
        const { assignedUserIds, ...updateData } = data;

        // If assignedUserIds is provided, we sync the assignments
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

    async remove(id: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Delete Assignments
            await tx.campaignQA.deleteMany({ where: { campaignId: id } });

            // 2. Identify forms to clean up audits that might reference them (even from other campaigns)
            const formVersions = await tx.monitoringFormVersion.findMany({
                where: { form: { campaignId: id } },
                select: { id: true }
            });
            const formVersionIds = formVersions.map(fv => fv.id);

            // 2b. Identify all audits for this campaign OR using this campaign's forms
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

                // Disputes
                const disputes = await tx.dispute.findMany({ where: { auditId: { in: auditIds } }, select: { id: true } });
                const disputeIds = disputes.map(d => d.id);
                if (disputeIds.length > 0) {
                    await tx.disputeItem.deleteMany({ where: { disputeId: { in: disputeIds } } });
                    await tx.dispute.deleteMany({ where: { id: { in: disputeIds } } });
                }

                await tx.audit.deleteMany({ where: { id: { in: auditIds } } });
            }

            // 3. Delete Sampling Runs & Sampled Tickets
            const runs = await tx.samplingRun.findMany({ where: { campaignId: id }, select: { id: true } });
            const runIds = runs.map(r => r.id);
            if (runIds.length > 0) {
                await tx.sampledTicket.deleteMany({ where: { runId: { in: runIds } } });
                await tx.samplingRun.deleteMany({ where: { id: { in: runIds } } });
            }

            // 4. Delete Tickets & Batches (Robust check for tickets in batches)
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


            // 5. Delete Forms (and versions)
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

            // 6. Delete Campaign
            return tx.campaign.delete({ where: { id } });
        });
    }

    async assignQa(campaignId: string, userId: string) {
        return this.prisma.campaignQA.create({
            data: {
                campaignId,
                userId
            }
        })
    }
}
