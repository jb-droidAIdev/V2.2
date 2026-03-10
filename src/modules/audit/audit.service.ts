import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditStatus, Role } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { SlaEngineService } from '../sla-engine/sla-engine.service';
import { subDays } from 'date-fns';

@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private slaEngine: SlaEngineService,
  ) { }

  async getActiveAudit(auditorId: string) {
    const audit = await this.prisma.audit.findFirst({
      where: {
        auditorId,
        status: AuditStatus.IN_PROGRESS,
      },
      include: {
        formVersion: {
          include: { criteria: true },
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
            sdm: true,
          },
        },
      },
    });
    return audit;
  }

  public calculateScore(criteria: any[], currentScores: any[]) {
    let totalPossible = 0;
    let totalEarned = 0;
    let isAutoFailed = false;

    const scoreMap = new Map(currentScores.map((s) => [s.criterionId, s]));

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

    const percent =
      totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

    return {
      percent: isAutoFailed ? 0 : percent,
      isAutoFailed,
      totalEarned,
      totalPossible,
    };
  }

  async findAll(user: any, options?: { limit?: number; offset?: number }) {
    const where: any = {};
    const permissions = user.permissions || [];
    const canViewAll =
      permissions.includes('AUDIT_VIEW_ALL') || permissions.includes('*');
    const canViewTeam = permissions.includes('AUDIT_VIEW_TEAM');
    const canViewOwn = permissions.includes('AUDIT_VIEW_OWN');

    if (canViewAll) {
      // Sees everything, no filters
    } else if (canViewTeam) {
      // Check for campaign assignments
      const assignments = await this.prisma.campaignQA.findMany({
        where: { userId: user.id, isActive: true },
        select: { campaignId: true },
      });

      const assignedIds = assignments.map((a) => a.campaignId);

      if (assignedIds.length > 0) {
        where.campaignId = { in: assignedIds };
      } else {
        // Fallback: If no campaign assignments, see their own team's audits
        where.agent = { employeeTeam: user.employeeTeam || 'UNKNOWN' };
      }
    } else if (canViewOwn) {
      // Agents see their own results only, and only if released/disputed
      where.agentId = user.id;
      where.status = {
        in: [
          AuditStatus.RELEASED,
          (AuditStatus as any).ACKNOWLEDGED,
          AuditStatus.DISPUTED,
          AuditStatus.REAPPEALED,
        ],
      };
    } else {
      // Default: No view permissions, return nothing
      return [];
    }

    const queryOptions: any = {
      where,
      include: {
        agent: {
          select: { name: true, eid: true, email: true },
        },
        auditor: {
          select: { name: true, eid: true, role: true },
        },
        campaign: {
          select: { name: true, projectCode: true },
        },
        formVersion: {
          include: {
            form: {
              select: { name: true },
            },
          },
        },
        fieldValues: true,
        sampledTicket: {
          include: { ticket: true },
        },
        userViews: {
          where: { userId: user.id },
        },
        coachingLog: {
          select: { id: true, releasedAt: true },
        },
      } as any,
      orderBy: { lastActionAt: 'desc' },
    };

    if (options?.limit) {
      queryOptions.take = Number(options.limit);
      queryOptions.skip = Number(options.offset || 0);
    }

    const audits = await this.prisma.audit.findMany(queryOptions);
    const total = await this.prisma.audit.count({ where });

    const data = (audits as any[]).map((audit) => {
      const lastView = audit.userViews?.[0];
      const isUnread =
        !lastView || new Date(lastView.viewedAt) < new Date(audit.lastActionAt);
      return { ...audit, isUnread };
    });

    return options?.limit ? { data, total } : data;
  }

  async getFailures(user: any, filters: any = {}) {
    const where: any = {
      status: {
        in: [
          AuditStatus.SUBMITTED,
          AuditStatus.RELEASED,
          AuditStatus.DISPUTED,
          AuditStatus.REAPPEALED,
          (AuditStatus as any).ACKNOWLEDGED,
        ],
      },
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
        const realCampaignIds = campaignIds.filter(
          (id: string) => !id.startsWith('TEAM:'),
        );

        const campaignConditions: any[] = [];
        if (realCampaignIds.length > 0) {
          campaignConditions.push({ campaignId: { in: realCampaignIds } });
        }
        if (teamNames.length > 0) {
          campaignConditions.push({
            agent: { employeeTeam: { in: teamNames } },
          });
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
      if (filters.startDate)
        where.submittedAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const ed = new Date(filters.endDate);
        ed.setHours(23, 59, 59, 999);
        where.submittedAt.lte = ed;
      }
    }

    // 3. Permission-based Data Visibility
    const permissions = user.permissions || [];
    const canViewAll =
      permissions.includes('AUDIT_VIEW_ALL') || permissions.includes('*');
    const canViewTeam = permissions.includes('AUDIT_VIEW_TEAM');
    const canViewOwn = permissions.includes('AUDIT_VIEW_OWN');

    if (canViewAll) {
      // Sees everything
    } else if (canViewTeam) {
      const userAssignments = await this.prisma.campaignQA.findMany({
        where: { userId: user.id, isActive: true },
        select: { campaignId: true },
      });
      const assignedIds = userAssignments.map((a) => a.campaignId);

      if (assignedIds.length > 0) {
        if (where.campaignId && where.campaignId.in) {
          const requested = where.campaignId.in;
          const intersected = requested.filter((id: string) =>
            assignedIds.includes(id),
          );
          if (intersected.length === 0) return [];
          where.campaignId = { in: intersected };
        } else {
          where.campaignId = { in: assignedIds };
        }
      } else {
        // Fallback: see their own team's failures
        where.agent = {
          ...where.agent,
          employeeTeam: user.employeeTeam || 'UNKNOWN',
        };
      }
    } else if (canViewOwn) {
      where.agentId = user.id;
      where.status = {
        in: [
          AuditStatus.RELEASED,
          (AuditStatus as any).ACKNOWLEDGED,
          AuditStatus.DISPUTED,
          AuditStatus.REAPPEALED,
        ],
      };
    } else {
      return [];
    }

    return this.prisma.audit.findMany({
      where: {
        ...where,
        scores: {
          some: {
            isFailed: true,
          },
        },
      },
      take: 200, // Reasonable limit for "All" view without pagination for now
      orderBy: { submittedAt: 'desc' },
      include: {
        agent: { select: { name: true, employeeTeam: true } },
        campaign: { select: { name: true } },
        sampledTicket: {
          include: {
            ticket: { select: { externalTicketId: true } },
          },
        },
        scores: {
          where: { isFailed: true },
          select: {
            comment: true,
            criterion: {
              select: {
                title: true,
                categoryName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Start a new audit with Poka-Yoke lock (One active audit per QA)
   */
  async startAudit(
    sampledTicketId: string,
    auditorId: string,
    formVersionId: string,
    campaignId: string,
  ) {
    // 1. Poka-yoke: Check for existing open audit
    const activeAudits = await this.prisma.audit.count({
      where: {
        auditorId,
        status: AuditStatus.IN_PROGRESS,
      },
    });

    if (activeAudits > 0) {
      throw new BadRequestException(
        'You already have an audit in progress. Please finish or submit it before starting a new one.',
      );
    }

    // 2. Create the new audit
    const ticket = await this.prisma.sampledTicket.findUnique({
      where: { id: sampledTicketId },
      include: { ticket: true },
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
          ticketReference: { equals: sanitizedReference, mode: 'insensitive' },
        },
        include: { campaign: true },
      });

      if (conflict) {
        // Completed/Active Audit Statuses that trigger a hard block
        const completedStatuses = [
          AuditStatus.RELEASED,
          AuditStatus.SUBMITTED,
          AuditStatus.DISPUTED,
          AuditStatus.REAPPEALED,
        ];
        // Case A: Someone (could be us or someone else) already finished this ticket
        if (completedStatuses.includes(conflict.status as any)) {
          throw new BadRequestException(
            `Ticket "${sanitizedReference}" has already been audited in the "${conflict.campaign?.name}" campaign.`,
          );
        }

        // Case B: WE are currently auditing this ticket (IN_PROGRESS) in THIS campaign
        // Just return it immediately to avoid Poka-Yoke conflicts later
        if (
          conflict.auditorId === data.auditorId &&
          conflict.status === AuditStatus.IN_PROGRESS &&
          conflict.campaignId === data.campaignId
        ) {
          return this.prisma.audit.findUnique({
            where: { id: conflict.id },
            include: {
              formVersion: { include: { criteria: true } },
              agent: {
                select: {
                  id: true,
                  name: true,
                  eid: true,
                  employeeTeam: true,
                  supervisor: true,
                  manager: true,
                  sdm: true,
                },
              },
            },
          });
        }

        // Case C: WE are auditing it elsewhere OR Someone ELSE is currently auditing this ticket
        throw new BadRequestException(
          `Ticket "${sanitizedReference}" is currently being audited in the "${conflict.campaign?.name}" campaign.`,
        );
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
          include: { criteria: true },
        },
        agent: {
          select: {
            id: true,
            name: true,
            eid: true,
            employeeTeam: true,
            supervisor: true,
            manager: true,
            sdm: true,
          },
        },
      },
    });

    // Check if the existing audit is "pristine" (no work done yet)
    if (existingAudit) {
      // If it matches exactly (Agent + Ticket + Campaign), just return it
      if (
        existingAudit.campaignId === data.campaignId &&
        existingAudit.agentId === data.agentId &&
        existingAudit.ticketReference === sanitizedReference
      ) {
        return existingAudit;
      }

      const [scoreCount, fieldCount] = await Promise.all([
        this.prisma.auditScore.count({ where: { auditId: existingAudit.id } }),
        this.prisma.auditFieldValue.count({
          where: { auditId: existingAudit.id },
        }),
      ]);

      // If it's empty, we can repurpose it
      if (scoreCount === 0 && fieldCount === 0) {
        // Robust lookup for the active form version of the new target campaign
        const targetCampaign = await this.prisma.campaign.findUnique({
          where: { id: data.campaignId },
        });

        const activeForm = await this.prisma.monitoringForm.findFirst({
          where: {
            OR: [
              { campaignId: data.campaignId },
              { teamName: targetCampaign?.name, campaignId: null },
            ],
            isArchived: false,
          },
          include: {
            versions: { where: { isActive: true }, take: 1 },
          },
        });

        if (activeForm && activeForm.versions[0]) {
          const newFormVersionId = activeForm.versions[0].id;

          return await this.prisma.audit.update({
            where: { id: existingAudit.id },
            data: {
              campaignId: data.campaignId,
              agentId: data.agentId,
              formVersionId: newFormVersionId,
              ticketReference: sanitizedReference,
            },
            include: {
              formVersion: { include: { criteria: true } },
              agent: {
                select: {
                  id: true,
                  name: true,
                  eid: true,
                  employeeTeam: true,
                  supervisor: true,
                  manager: true,
                  sdm: true,
                },
              },
            },
          });
        }
      }

      // If it's NOT empty and doesn't match, block starting a new one
      const campaignInfo = await this.prisma.campaign.findUnique({
        where: { id: existingAudit.campaignId },
        select: { name: true },
      });
      throw new BadRequestException(
        `Active session detected: You are currently auditing Ticket "${existingAudit.ticketReference || 'Unknown'}" in "${campaignInfo?.name || 'Another Campaign'}". Please finalize or submit it before starting a new session.`,
      );
    }

    // 3. Get the active form for this campaign (using robust lookup)
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: data.campaignId },
    });

    const activeForm = await this.prisma.monitoringForm.findFirst({
      where: {
        OR: [
          { campaignId: data.campaignId },
          { teamName: campaign?.name, campaignId: null },
        ],
        isArchived: false,
      },
      include: {
        versions: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!activeForm || !activeForm.versions[0]) {
      throw new BadRequestException(
        'No active scorecard found for this campaign.',
      );
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
          include: { criteria: true },
        },
        agent: {
          select: {
            id: true,
            name: true,
            eid: true,
            employeeTeam: true,
            supervisor: true,
            manager: true,
            sdm: true,
          },
        },
      },
    });
  }

  async findOne(id: string, user: any) {
    const audit = await this.prisma.audit.findUnique({
      where: { id },
      include: {
        formVersion: {
          include: { criteria: true },
        },
        fieldValues: true,
        scores: {
          include: { criterion: true },
        },
        agent: {
          select: { id: true, name: true, eid: true, employeeTeam: true },
        },
        auditor: {
          select: { id: true, name: true, eid: true },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            projectCode: true,
            ztpWindowDays: true,
            ztpMilestones: true,
            ztpAckSlaHours: true
          },
        },
        sampledTicket: {
          include: { ticket: true },
        },
        coachingLog: {
          select: { id: true, releasedAt: true, agentAckAt: true, supervisorId: true },
        },
      },
    });

    if (!audit) throw new NotFoundException('Audit not found');

    // ── Permission & Ownership Check ───────────────────────────────────
    const perms = user.permissions || [];
    const isOwner = audit.agentId === user.id;
    const isAuditor = audit.auditorId === user.id;
    const canViewAll = perms.includes('AUDIT_VIEW_ALL') || perms.includes('*');
    const canViewOwn = perms.includes('AUDIT_VIEW_OWN') && isOwner;

    let isAuthorized = canViewAll || canViewOwn || isAuditor;

    if (!isAuthorized && perms.includes('AUDIT_VIEW_TEAM')) {
      // Check campaign assignments
      const assignments = await this.prisma.campaignQA.findMany({
        where: { userId: user.id, isActive: true },
        select: { campaignId: true },
      });
      const assignedIds = assignments.map((a) => a.campaignId);

      const isAssignedToCampaign = assignedIds.includes(audit.campaignId);
      const isSameTeam = audit.agent?.employeeTeam === user.employeeTeam;

      if (isAssignedToCampaign || isSameTeam) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException('You are not authorized to view this audit');
    }

    // Record view safely
    try {
      await (this.prisma as any).auditUserView.upsert({
        where: { auditId_userId: { auditId: id, userId: user.id } },
        create: { auditId: id, userId: user.id },
        update: { viewedAt: new Date() },
      });
    } catch (e) {
      console.warn('Failed to track audit view:', e);
    }

    // ENRICHMENT: Calculate ZTP Milestones for the preview
    // Optimized: Fetch all relevant failures for this agent/window ONCE instead of N times
    const auditDate = new Date(audit.submittedAt || audit.releasedAt || (audit as any).startedAt);
    const ztpWindowDays = audit.campaign?.ztpWindowDays ?? 30;
    const windowStart = subDays(auditDate, ztpWindowDays);
    const validStatuses = [AuditStatus.RELEASED, AuditStatus.DISPUTED, AuditStatus.REAPPEALED, AuditStatus.ACKNOWLEDGED];

    const allFailuresInWindow = await this.prisma.auditScore.findMany({
      where: {
        isFailed: true,
        audit: {
          status: { in: validStatuses },
          agentId: audit.agentId,
          campaignId: audit.campaignId,
          submittedAt: { gte: windowStart, lte: auditDate },
        }
      },
      select: { categoryLabel: true, criterionTitle: true, criterion: { select: { categoryName: true, title: true } } }
    });

    const enrichedScores = audit.scores.map((score) => {
      const anyDate = audit.submittedAt || audit.releasedAt || audit.startedAt;
      if (!score.isFailed || !anyDate)
        return { ...score, reachedMilestone: null };

      const parameterName = (score.criterionTitle || score.criterion?.title || 'Unknown Parameter').trim();
      const categoryName = (score.categoryLabel || score.criterion?.categoryName || 'General').trim();

      const categoryCount = allFailuresInWindow.filter(f => {
        const fCat = (f.categoryLabel || f.criterion?.categoryName || 'General').trim();
        return fCat === categoryName;
      }).length;

      const parameterCount = allFailuresInWindow.filter(f => {
        const fParam = (f.criterionTitle || f.criterion?.title || 'Unknown Parameter').trim();
        return fParam === parameterName;
      }).length;

      const milestones = (audit.campaign?.ztpMilestones as number[]) ?? [3, 6, 9, 12, 15];
      const sortedMilestones = [...milestones].sort((a, b) => a - b);

      const reachedMilestone = [...sortedMilestones].reverse().find((m) => parameterCount >= m) || null;
      const nextMilestone = sortedMilestones.find((m) => m > parameterCount) || null;

      return {
        ...score,
        reachedMilestone,
        ztpCount: categoryCount,
        ztpNextMilestone: nextMilestone,
        parameterZtpCount: parameterCount
      };
    });

    return { ...audit, scores: enrichedScores };
  }

  async autosave(
    id: string,
    auditorId: string,
    data: {
      ticketReference?: string;
      fieldValues?: Record<string, string>;
      scores?: {
        criterionId: string;
        score: number;
        comment?: string;
        isFailed?: boolean;
      }[];
    },
  ) {
    const audit = await this.prisma.audit.findUnique({
      where: { id },
      include: { formVersion: { include: { criteria: true } } },
    });

    if (!audit) throw new NotFoundException('Audit not found');

    // Universal Access: Admins can autosave any session
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: auditorId },
    });
    if (audit.auditorId !== auditorId && requestingUser?.role !== 'ADMIN') {
      throw new ForbiddenException('Not the owner of this audit session');
    }

    // 1. Update Custom Fields using atomic upserts
    if (data.fieldValues) {
      await Promise.all(
        Object.entries(data.fieldValues).map(([key, value]) =>
          this.prisma.auditFieldValue.upsert({
            where: { auditId_fieldName: { auditId: id, fieldName: key } },
            create: { auditId: id, fieldName: key, value },
            update: { value },
          }),
        ),
      );
    }

    // 2. Update Scores using atomic upserts with snapshots for data integrity
    if (data.scores) {
      await Promise.all(
        data.scores.map((item) => {
          const criterion = audit.formVersion.criteria.find(
            (c) => c.id === item.criterionId,
          );
          return this.prisma.auditScore.upsert({
            where: {
              auditId_criterionId: {
                auditId: id,
                criterionId: item.criterionId,
              },
            },
            create: {
              auditId: id,
              criterionId: item.criterionId,
              score: item.score,
              comment: item.comment,
              isFailed: item.isFailed || false,
              // Snapshot labels for historical integrity
              categoryLabel: criterion?.categoryName,
              criterionTitle: criterion?.title,
            },
            update: {
              score: item.score,
              comment: item.comment,
              isFailed: item.isFailed,
              // Update snapshots if they changed in a form edit (while audit is in progress)
              categoryLabel: criterion?.categoryName,
              criterionTitle: criterion?.title,
            },
          });
        }),
      );
    }

    // 3. Recalculate Live Score
    const allScores = await this.prisma.auditScore.findMany({
      where: { auditId: id },
    });
    const { percent, isAutoFailed } = this.calculateScore(
      audit.formVersion.criteria,
      allScores,
    );

    await this.prisma.audit.update({
      where: { id },
      data: {
        ...(data.ticketReference !== undefined
          ? { ticketReference: data.ticketReference }
          : {}),
        score: percent,
        isAutoFailed,
        lastActionAt: new Date(),
      },
    });

    return { status: 'saved', score: percent };
  }

  async submit(id: string, auditorId: string) {
    // 1. Fetch final state with ALL required relations for notification
    const audit = await this.prisma.audit.findUnique({
      where: { id },
      include: {
        scores: true,
        formVersion: {
          include: {
            criteria: true,
            form: { select: { name: true } },
          },
        },
        agent: true,
        auditor: true,
        campaign: true,
        fieldValues: true,
      },
    });

    if (!audit) throw new NotFoundException('Audit not found');

    // Universal Access: Admins can autosave any session
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: auditorId },
    });
    if (audit.auditorId !== auditorId && requestingUser?.role !== 'ADMIN') {
      throw new ForbiddenException('Not the owner of this audit session');
    }

    // 2. Data Integrity Validation WITH FRESHEST DATA
    const dbScores = await this.prisma.auditScore.findMany({
      where: { auditId: id },
      include: { criterion: true },
    });

    // A. Completeness Check (Only count scores for parameters in this specific FormVersion)
    const validCriterionIds = new Set(
      audit.formVersion.criteria.map((c) => c.id),
    );
    const relevantScores = dbScores.filter((s) =>
      validCriterionIds.has(s.criterionId),
    );
    const scoredCriteriaIds = new Set(relevantScores.map((s) => s.criterionId));

    if (scoredCriteriaIds.size !== audit.formVersion.criteria.length) {
      throw new BadRequestException(
        `Audit is incomplete. Scored ${scoredCriteriaIds.size} out of ${audit.formVersion.criteria.length} items.`,
      );
    }

    // B. Mandatory remarks for "No" scores
    const failedScoresWithoutRemarks = relevantScores.filter((s) => {
      const hasValidComment = s.comment && s.comment.trim().length >= 10;
      return s.isFailed && !hasValidComment;
    });

    if (failedScoresWithoutRemarks.length > 0) {
      const names = failedScoresWithoutRemarks
        .map((s) => s.criterion?.title || s.criterionId)
        .join(', ');
      throw new BadRequestException(
        `Detailed remarks required for failed items: ${names}`,
      );
    }

    // 3. Final Score Verification & Snapshotting Enforcement
    const { percent, isAutoFailed } = this.calculateScore(
      audit.formVersion.criteria,
      relevantScores,
    );

    const updatePromises = relevantScores
      .filter((score) => !score.categoryLabel || !score.criterionTitle)
      .map((score) =>
        this.prisma.auditScore.update({
          where: { id: score.id },
          data: {
            categoryLabel: score.criterion?.categoryName,
            criterionTitle: score.criterion?.title,
          },
        }),
      );
    await Promise.all(updatePromises);

    // 3. Official Submission -> Auto Release protocol
    const now = new Date();
    // Use Campaign config for SLA (default 2 business days)
    const slaDays = Math.max(1, Math.round((audit.campaign?.ztpAckSlaHours ?? 48) / 24));
    const deadline = await this.slaEngine.calculateDueDate(now, slaDays, audit.campaignId);

    const updatedAudit = await this.prisma.audit.update({
      where: { id },
      data: {
        status:
          Math.round(percent) === 100
            ? AuditStatus.ACKNOWLEDGED
            : AuditStatus.RELEASED,
        submittedAt: now,
        releasedAt: now,
        agentAckDeadline: Math.round(percent) === 100 ? null : deadline,
        score: percent,
        isAutoFailed,
        lastActionAt: now,
      },
    });

    // --- TRANSPARENT NOTIFICATION LOGIC ---
    try {
      const ccEmails: string[] = [];

      // 1. Ops Hierarchy (Supervisor/Manager)
      if (audit.agent.supervisor) {
        const sup = await this.prisma.user.findFirst({
          where: {
            name: {
              equals: audit.agent.supervisor.trim(),
              mode: 'insensitive',
            },
          },
          select: { email: true },
        });
        if (sup?.email) ccEmails.push(sup.email);
      }
      if (audit.agent.manager) {
        const mgr = await this.prisma.user.findFirst({
          where: {
            name: { equals: audit.agent.manager.trim(), mode: 'insensitive' },
          },
          select: { email: true },
        });
        if (mgr?.email) ccEmails.push(mgr.email);
      }

      // 2. QA Hierarchy (QA TL / Manager)
      const qaHierarchy = await this.prisma.user.findMany({
        where: {
          role: { in: ['QA_TL', 'QA_MANAGER'] },
          isActive: true,
        },
        select: { email: true },
      });
      qaHierarchy.forEach((u) => u.email && ccEmails.push(u.email));

      const interactionDate =
        audit.fieldValues.find((f) => f.fieldName === 'interactionDate')
          ?.value || 'N/A';

      // 1. Send to Agent (No CC)
      await this.mailService.sendNewAuditToAgent({
        to: audit.agent.email,
        agentName: audit.agent.name,
        ticketId: audit.ticketReference || 'N/A',
        score: percent,
        auditorName: audit.auditor.name,
        campaignName: audit.campaign?.name || audit.formVersion.form.name,
      });

      // 2. Send to Ops TL (With Manager CC)
      if (audit.agent.supervisor) {
        const sup = await this.prisma.user.findFirst({
          where: {
            name: {
              equals: audit.agent.supervisor.trim(),
              mode: 'insensitive',
            },
          },
          select: { email: true },
        });

        if (sup?.email) {
          const managerEmails = [];
          if (audit.agent.manager) {
            const mgr = await this.prisma.user.findFirst({
              where: {
                name: {
                  equals: audit.agent.manager.trim(),
                  mode: 'insensitive',
                },
              },
              select: { email: true },
            });
            if (mgr?.email) managerEmails.push(mgr.email);
          }

          await this.mailService.sendNewAuditToOps({
            to: sup.email,
            cc: managerEmails,
            opsTlName: audit.agent.supervisor,
            agentName: audit.agent.name,
            ticketId: audit.ticketReference || 'N/A',
            score: percent,
            auditorName: audit.auditor.name,
            campaignName: audit.campaign?.name || audit.formVersion.form.name,
            interactionDate,
            isAutoFailed,
          });
        }
      }
    } catch (mailError) {
      console.warn('Post-submission email failed:', mailError);
    }

    return updatedAudit;
  }

  async acknowledgeAudit(id: string, agentId: string) {
    const audit = await this.prisma.audit.findUnique({
      where: { id },
    });

    if (!audit) throw new NotFoundException('Audit not found');
    if (audit.agentId !== agentId) {
      throw new ForbiddenException(
        'You are not authorized to acknowledge this audit',
      );
    }

    if (audit.status !== AuditStatus.RELEASED) {
      throw new BadRequestException('Only released audits can be acknowledged');
    }

    return this.prisma.$transaction(async (tx) => {
      // Mark audit as acknowledged
      const updated = await tx.audit.update({
        where: { id },
        data: {
          status: AuditStatus.ACKNOWLEDGED,
          lastActionAt: new Date(),
        },
      });

      // Synchronize coaching log if exists
      await tx.coachingLog.updateMany({
        where: { auditId: id, agentAckAt: null },
        data: { agentAckAt: new Date() },
      });

      return updated;
    });
  }

  async getQueue(auditorId: string) {
    return this.prisma.sampledTicket.findMany({
      where: {
        assignedQaId: auditorId,
        status: 'READY',
      },
      include: {
        ticket: true,
      },
    });
  }

  async discard(id: string, auditorId: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id } });
    if (!audit) throw new NotFoundException('Audit not found');

    if (audit.auditorId !== auditorId) {
      throw new ForbiddenException('You can only discard your own audits');
    }

    // Allow discarding if IN_PROGRESS, DRAFT, failing validation etc.
    // Basically anything that isn't already SUBMITTED/RELEASED etc.
    const eligibleStatuses: AuditStatus[] = [
      AuditStatus.IN_PROGRESS,
      AuditStatus.DRAFT,
    ];
    if (!eligibleStatuses.includes(audit.status)) {
      throw new BadRequestException(
        'Only in-progress or draft audits can be discarded.',
      );
    }

    return this.remove(id);
  }

  async discardAllByFormVersion(formId: string) {
    const inProgressAudits = await this.prisma.audit.findMany({
      where: {
        formVersion: {
          formId,
        },
        status: {
          in: [AuditStatus.IN_PROGRESS, AuditStatus.DRAFT],
        },
      },
      select: { id: true },
    });

    console.log(
      `Discarding ${inProgressAudits.length} in-progress audits for form ${formId}`,
    );

    for (const audit of inProgressAudits) {
      await this.remove(audit.id);
    }

    return { discardedCount: inProgressAudits.length };
  }

  async remove(id: string) {
    const audit = await this.prisma.audit.findUnique({ where: { id } });
    if (!audit) throw new NotFoundException('Audit not found');

    // Restore sampled ticket status if it exists
    if (audit.sampledTicketId) {
      try {
        await this.prisma.sampledTicket.update({
          where: { id: audit.sampledTicketId },
          data: { status: 'READY' },
        });
      } catch (e) {
        console.warn('Failed to reset sampled ticket status:', e);
      }
    }

    // Clean up Dispute + Dispute Items
    const dispute = await this.prisma.dispute.findUnique({
      where: { auditId: id },
    });
    if (dispute) {
      await this.prisma.disputeItem.deleteMany({
        where: { disputeId: dispute.id },
      });
      await this.prisma.dispute.delete({ where: { auditId: id } });
    }

    // Clean up other scalar relational records
    await this.prisma.releaseRecord.deleteMany({ where: { auditId: id } });
    await this.prisma.auditEvent.deleteMany({ where: { auditId: id } });
    await this.prisma.calibrationAnchor.deleteMany({ where: { auditId: id } });

    // Unlink CalibrationTickets instead of deleting
    await this.prisma.calibrationTicket.updateMany({
      where: { auditId: id },
      data: { auditId: null },
    });

    await this.prisma.auditScore.deleteMany({ where: { auditId: id } });
    await this.prisma.auditFieldValue.deleteMany({ where: { auditId: id } });

    // Cleanup User Views
    await this.prisma.auditUserView.deleteMany({ where: { auditId: id } });

    return this.prisma.audit.delete({
      where: { id },
    });
  }
}
