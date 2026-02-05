import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditStatus, Role } from '@prisma/client';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async getActiveAudit(auditorId: string) {
        const audit = await this.prisma.audit.findFirst({
            where: {
                auditorId,
                status: AuditStatus.IN_PROGRESS,
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

    public calculateScore(criteria: any[], currentScores: any[]) {
        let totalPossible = 0;
        let totalEarned = 0;
        let isAutoFailed = false;

        const scoreMap = new Map(currentScores.map(s => [s.criterionId, s]));

        criteria.forEach((criterion) => {
            const scoreObj = scoreMap.get(criterion.id);
            if (scoreObj) {
                if (scoreObj.score === -1) {
                    // N/A: Skip from both possible and earned
                    return;
                }

                totalPossible += criterion.weight;
                totalEarned += scoreObj.score;

                // Check for Auto-Fail (Critical parameter with a NO selection)
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

    async findAll(user: any) {
        let where: any = {};

        // RBAC: Data Visibility Logic
        if (user.role === Role.AGENT) {
            // Agents only see their OWN audits which are RELEASED
            where.agentId = user.id;
            where.status = { in: [AuditStatus.RELEASED, (AuditStatus as any).DISPUTED, (AuditStatus as any).REAPPEALED] };
        } else if ([Role.QA_TL, Role.OPS_TL].includes(user.role)) {
            // Team Leaders see audits for their entire team
            // Note: We use employeeTeam from the agent profile associated with the audit
            where.agent = {
                employeeTeam: user.employeeTeam
            };
        }
        // ADMIN and QA see everything (where stays empty)

        return this.prisma.audit.findMany({
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
                }
            },
            orderBy: { lastActionAt: 'desc' }
        });
    }

    async getFailures(user: any, filters: any = {}) {
        let where: any = {
            status: { in: [AuditStatus.SUBMITTED, AuditStatus.RELEASED, AuditStatus.DISPUTED, AuditStatus.REAPPEALED] }
        };

        // 1. Campaign Filtering (Supports both real campaigns and implicit Team names)
        if (filters.campaignId) {
            const campaignIds = Array.isArray(filters.campaignId)
                ? filters.campaignId
                : String(filters.campaignId).split(',').filter(Boolean);

            if (campaignIds.length > 0) {
                const teamNames = campaignIds
                    .filter((id: string) => id.startsWith('TEAM:'))
                    .map((id: string) => id.replace('TEAM:', ''));
                const realCampaignIds = campaignIds.filter((id: string) => !id.startsWith('TEAM:'));

                let campaignConditions: any[] = [];
                if (realCampaignIds.length > 0) {
                    campaignConditions.push({ campaignId: { in: realCampaignIds } });
                }
                if (teamNames.length > 0) {
                    campaignConditions.push({ agent: { employeeTeam: { in: teamNames } } });
                }

                if (campaignConditions.length > 1) {
                    where.OR = campaignConditions;
                } else if (campaignConditions.length === 1) {
                    const cond = campaignConditions[0];
                    if (cond.campaignId) where.campaignId = cond.campaignId;
                    if (cond.agent) where.agent = { ...where.agent, ...cond.agent };
                }
            }
        }

        // 2. Date Filtering
        if (filters.startDate || filters.endDate) {
            where.submittedAt = {};
            if (filters.startDate) where.submittedAt.gte = new Date(filters.startDate);
            if (filters.endDate) {
                const ed = new Date(filters.endDate);
                ed.setHours(23, 59, 59, 999);
                where.submittedAt.lte = ed;
            }
        }

        // 3. RBAC: Data Visibility Logic
        if (user.role === Role.AGENT) {
            where.agentId = user.id;
            where.status = { in: [AuditStatus.RELEASED, (AuditStatus as any).DISPUTED, (AuditStatus as any).REAPPEALED] };
        } else if ([Role.QA_TL, Role.OPS_TL].includes(user.role)) {
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
            take: 200, // Reasonable limit for "All" view without pagination for now
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

    /**
     * Start a new audit with Poka-Yoke lock (One active audit per QA)
     */
    async startAudit(sampledTicketId: string, auditorId: string, formVersionId: string, campaignId: string) {
        // 1. Poka-yoke: Check for existing open audit
        const activeAudits = await this.prisma.audit.count({
            where: {
                auditorId,
                status: AuditStatus.IN_PROGRESS,
            },
        });

        if (activeAudits > 0) {
            throw new BadRequestException('You already have an audit in progress. Please finish or submit it before starting a new one.');
        }

        // 2. Create the new audit
        const ticket = await this.prisma.sampledTicket.findUnique({
            where: { id: sampledTicketId },
            include: { ticket: true }
        });

        if (!ticket) throw new BadRequestException('Ticket not found');

        return await this.prisma.audit.create({
            data: {
                campaignId,
                sampledTicketId,
                formVersionId,
                auditorId,
                agentId: ticket.ticket.agentId,
                status: AuditStatus.IN_PROGRESS,
            },
        });
    }

    /**
     * Create a manual audit for Evaluate page
     */
    async createManualAudit(data: {
        campaignId: string;
        agentId: string;
        auditorId: string;
        ticketReference?: string;
    }) {
        const sanitizedReference = data.ticketReference?.trim();

        // 1. Global Duplicate Check (Must run first)
        if (sanitizedReference) {
            const conflict = await this.prisma.audit.findFirst({
                where: {
                    ticketReference: { equals: sanitizedReference, mode: 'insensitive' }
                },
                include: { campaign: true }
            });

            if (conflict) {
                // Completed/Active Audit Statuses that trigger a hard block
                const completedStatuses = [
                    AuditStatus.RELEASED,
                    AuditStatus.SUBMITTED,
                    AuditStatus.DISPUTED,
                    AuditStatus.REAPPEALED
                ];
                // Case A: Someone (could be us or someone else) already finished this ticket
                if (completedStatuses.includes(conflict.status as any)) {
                    throw new BadRequestException(`Ticket "${sanitizedReference}" has already been audited in the "${conflict.campaign?.name}" campaign.`);
                }

                // Case B: WE are currently auditing this ticket (IN_PROGRESS) in THIS campaign
                // Just return it immediately to avoid Poka-Yoke conflicts later
                if (conflict.auditorId === data.auditorId &&
                    conflict.status === AuditStatus.IN_PROGRESS &&
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

                // Case C: WE are auditing it elsewhere OR Someone ELSE is currently auditing this ticket
                throw new BadRequestException(`Ticket "${sanitizedReference}" is currently being audited in the "${conflict.campaign?.name}" campaign.`);
            }
        }

        // 2. Poka-yoke Check:
        // Instead of strictly blocking, let's see if we can resume an existing IN_PROGRESS one
        const existingAudit = await this.prisma.audit.findFirst({
            where: {
                auditorId: data.auditorId,
                status: AuditStatus.IN_PROGRESS,
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

        // Check if the existing audit is "pristine" (no work done yet)
        if (existingAudit) {
            // If it matches exactly (Agent + Ticket + Campaign), just return it
            if (existingAudit.campaignId === data.campaignId &&
                existingAudit.agentId === data.agentId &&
                existingAudit.ticketReference === sanitizedReference) {
                return existingAudit;
            }

            const [scoreCount, fieldCount] = await Promise.all([
                this.prisma.auditScore.count({ where: { auditId: existingAudit.id } }),
                this.prisma.auditFieldValue.count({ where: { auditId: existingAudit.id } })
            ]);

            // If it's empty, we can repurpose it
            if (scoreCount === 0 && fieldCount === 0) {
                // Robust lookup for the active form version of the new target campaign
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

            // If it's NOT empty and doesn't match, block starting a new one
            const campaignInfo = await this.prisma.campaign.findUnique({ where: { id: existingAudit.campaignId }, select: { name: true } });
            throw new BadRequestException(`Active session detected: You are currently auditing Ticket "${existingAudit.ticketReference || 'Unknown'}" in "${campaignInfo?.name || 'Another Campaign'}". Please finalize or submit it before starting a new session.`);
        }

        // 3. Get the active form for this campaign (using robust lookup)
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
            throw new BadRequestException('No active scorecard found for this campaign.');
        }

        const formVersionId = activeForm.versions[0].id;

        // 3. Create the manual audit
        return await this.prisma.audit.create({
            data: {
                campaignId: data.campaignId,
                formVersionId,
                auditorId: data.auditorId,
                agentId: data.agentId,
                ticketReference: sanitizedReference,
                status: AuditStatus.IN_PROGRESS,
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

    async findOne(id: string) {
        const audit = await this.prisma.audit.findUnique({
            where: { id },
            include: {
                formVersion: {
                    include: { criteria: true }
                },
                fieldValues: true,
                scores: true,
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
        if (!audit) throw new NotFoundException('Audit not found');
        return audit;
    }

    async autosave(id: string, auditorId: string, data: { fieldValues?: Record<string, string>; scores?: { criterionId: string; score: number; comment?: string; isFailed?: boolean }[] }) {
        const audit = await this.prisma.audit.findUnique({
            where: { id },
            include: { formVersion: { include: { criteria: true } } }
        });

        if (!audit) throw new NotFoundException('Audit not found');

        // Universal Access: Admins can autosave any session
        const requestingUser = await this.prisma.user.findUnique({ where: { id: auditorId } });
        if (audit.auditorId !== auditorId && requestingUser?.role !== 'ADMIN') {
            throw new ForbiddenException('Not the owner of this audit session');
        }

        // 1. Update Custom Fields using atomic upserts
        if (data.fieldValues) {
            await Promise.all(Object.entries(data.fieldValues).map(([key, value]) =>
                this.prisma.auditFieldValue.upsert({
                    where: { auditId_fieldName: { auditId: id, fieldName: key } },
                    create: { auditId: id, fieldName: key, value },
                    update: { value }
                })
            ));
        }

        // 2. Update Scores using atomic upserts with snapshots for data integrity
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
                        // Snapshot labels for historical integrity
                        categoryLabel: criterion?.categoryName,
                        criterionTitle: criterion?.title
                    },
                    update: {
                        score: item.score,
                        comment: item.comment,
                        isFailed: item.isFailed,
                        // Update snapshots if they changed in a form edit (while audit is in progress)
                        categoryLabel: criterion?.categoryName,
                        criterionTitle: criterion?.title
                    }
                });
            }));
        }

        // 3. Recalculate Live Score
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

    async submit(id: string, auditorId: string) {
        // 1. Fetch final state
        const audit = await this.prisma.audit.findUnique({
            where: { id },
            include: {
                scores: true,
                formVersion: {
                    include: { criteria: true }
                }
            }
        });

        if (!audit) throw new NotFoundException('Audit not found');

        // Universal Access: Admins can autosave any session
        const requestingUser = await this.prisma.user.findUnique({ where: { id: auditorId } });
        if (audit.auditorId !== auditorId && requestingUser?.role !== 'ADMIN') {
            throw new ForbiddenException('Not the owner of this audit session');
        }

        // 2. Data Integrity Validation WITH FRESHEST DATA
        // Fetch scores directly to ensure we have the absolute latest committed state
        const dbScores = await this.prisma.auditScore.findMany({
            where: { auditId: id },
            include: { criterion: true }
        });

        // A. Completeness Check
        const scoredCriteriaIds = new Set(dbScores.map(s => s.criterionId));
        if (scoredCriteriaIds.size !== audit.formVersion.criteria.length) {
            throw new BadRequestException(`Audit is incomplete. Scored ${scoredCriteriaIds.size} out of ${audit.formVersion.criteria.length} items.`);
        }

        // B. Mandatory remarks for "No" scores
        // IMPORTANT: Check isFailed flag, not score value, because autofail parameters
        // have weight=0 even when marked as "Yes"
        const failedScoresWithoutRemarks = dbScores.filter(s => {
            const hasValidComment = s.comment && s.comment.trim().length >= 10;
            return s.isFailed && !hasValidComment;
        });

        if (failedScoresWithoutRemarks.length > 0) {
            const names = failedScoresWithoutRemarks.map(s => s.criterion?.title || s.criterionId).join(', ');
            throw new BadRequestException(`Detailed remarks required for failed items: ${names}`);
        }



        // 3. Final Score Verification & Snapshotting Enforcement
        // Use the fresh scores for calculation too
        const { percent, isAutoFailed } = this.calculateScore(audit.formVersion.criteria, dbScores);

        // Ensure all historical labels are set on submission (fallback check)
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

        // 3. Official Submission -> Auto Release protocol
        const now = new Date();
        const deadline = new Date(now);
        deadline.setDate(deadline.getDate() + 2); // 48 hours / 2 days SLA

        return this.prisma.audit.update({
            where: { id },
            data: {
                status: AuditStatus.RELEASED,
                submittedAt: now,
                releasedAt: now,
                agentAckDeadline: deadline,
                score: percent,
                isAutoFailed
            }
        });
    }

    async getQueue(auditorId: string) {
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

    async remove(id: string) {
        // Delete related records first to ensure referential integrity
        await this.prisma.auditScore.deleteMany({ where: { auditId: id } });
        await this.prisma.auditFieldValue.deleteMany({ where: { auditId: id } });

        return this.prisma.audit.delete({
            where: { id }
        });
    }
}
