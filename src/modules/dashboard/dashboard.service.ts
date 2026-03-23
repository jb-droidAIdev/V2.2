import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditStatus, Role } from '@prisma/client';
import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addHours,
  addDays,
  differenceInHours,
  isWeekend,
  isSameDay,
} from 'date-fns';

import { SlaEngineService } from '../sla-engine/sla-engine.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private slaEngine: SlaEngineService,
  ) { }

  async getStats(
    filters: {
      startDate?: string;
      endDate?: string;
      agentName?: string;
      agentId?: string | string[];
      ticketId?: string;
      campaignId?: string | string[];
      supervisor?: string | string[];
      sdm?: string | string[];
      auditorId?: string | string[];
      granularity?: 'day' | 'week' | 'month';
    },
    user: any,
  ) {
    try {
      if (!user) return this.getEmptyStats();
      const role = String(user?.role || user?.roleName || '').toUpperCase();
      const userId = user?.id || user?.userId;
      
      if (!userId) {
        console.error('[DASHBOARD] User ID missing from request context:', user);
        return this.getEmptyStats();
      }

      const restrictedRoles = [
        'QA_TL',
        'QATL',
        'OPS_TL',
        'OPSTL',
        'OPS_MANAGER',
        'OPSMANAGER',
        'SDM',
        'QA',
      ];
      const isStaff = role !== 'AGENT';
      const now = new Date();

      console.log(
        `[DASHBOARD] getStats Entry | User: ${userId} | Role: ${role} | Filters: ${JSON.stringify(filters)}`,
      );

      // [MANDATORY ASSIGNMENT CHECK]
      // If user is in a restricted role and has no campaign assignments, return blank data immediately.
      let assignedCampaignIds: string[] = [];
      if (restrictedRoles.includes(role)) {
        const userAssignments = await this.prisma.campaignQA.findMany({
          where: { userId: userId, isActive: true },
          select: { campaignId: true },
        });

        assignedCampaignIds = userAssignments.map((a) => a.campaignId);

        if (assignedCampaignIds.length === 0) {
          console.log(
            `[DASHBOARD] Restricted user ${userId} has no assignments - returning absolute blank state.`,
          );
          return this.getEmptyStats();
        }
      }

      const buildStatsWhere = (): any => {
        const conditions: any[] = [
          {
            status: {
              in: [
                'SUBMITTED',
                'RELEASED',
                'DISPUTED',
                'REAPPEALED',
                'ACKNOWLEDGED',
              ] as any,
            },
          },
        ];

        // 8. Role-based Security for Agent (Agents only see RELEASED data onwards)
        if (role === 'AGENT') {
          conditions[0].status.in = conditions[0].status.in.filter((s: any) => s !== AuditStatus.SUBMITTED);
        }

        // 1. Date Range (Aligned with UTC+8 Local Time)
        if (filters.startDate || filters.endDate) {
          const dateCond: any = {};
          if (filters.startDate) {
            const sd = new Date(filters.startDate);
            if (!isNaN(sd.getTime())) {
              // Align Local Midnight to UTC: 00:00 Local = 16:00 (Prev Day) UTC
              sd.setHours(sd.getHours() - 8); 
              dateCond.gte = sd;
            }
          }
          if (filters.endDate) {
            const ed = new Date(filters.endDate);
            if (!isNaN(ed.getTime())) {
              // End of Day Local (23:59:59) shifted to UTC (15:59:59 UTC)
              const localEndOfDay = endOfDay(ed);
              localEndOfDay.setHours(localEndOfDay.getHours() - 8);
              dateCond.lte = localEndOfDay;
            }
          }
          if (Object.keys(dateCond).length > 0) conditions.push({ submittedAt: dateCond });
        }

        // 2. Campaigns & Teams
        const campaignIds = this.normalizeArray(filters.campaignId);
        if (campaignIds.length > 0) {
          const teamNames = campaignIds.filter((id: string) => id.startsWith('TEAM:')).map((id: string) => id.replace('TEAM:', ''));
          const realIds = campaignIds.filter((id: string) => !id.startsWith('TEAM:'));

          const campaignOr = [];
          if (realIds.length > 0) campaignOr.push({ campaignId: { in: realIds } });
          if (teamNames.length > 0) campaignOr.push({ agent: { employeeTeam: { in: teamNames } } });

          if (campaignOr.length === 1) conditions.push(campaignOr[0]);
          else if (campaignOr.length > 1) conditions.push({ OR: campaignOr });
        }

        // 3. Auditor(s)
        const auditorIds = this.normalizeArray(filters.auditorId);
        if (auditorIds.length > 0) conditions.push({ auditorId: { in: auditorIds } });

        // 4. Agent Selection & Bios
        const agentIds = this.normalizeArray(filters.agentId);
        const supervisors = this.normalizeArray(filters.supervisor);
        const sdms = this.normalizeArray(filters.sdm);
        const agentName = filters.agentName;

        if (agentIds.length > 0 || supervisors.length > 0 || sdms.length > 0 || agentName) {
          conditions.push({
            agent: {
              ...(agentIds.length > 0 ? { id: { in: agentIds } } : {}),
              ...(supervisors.length > 0 ? { supervisor: { in: supervisors } } : {}),
              ...(sdms.length > 0 ? { sdm: { in: sdms } } : {}),
              ...(agentName ? { name: { contains: agentName, mode: 'insensitive' } } : {}),
            }
          });
        }

        // 5. Ticket ID Search
        if (filters.ticketId) {
          conditions.push({
            OR: [
              { sampledTicket: { ticket: { externalTicketId: { contains: filters.ticketId, mode: 'insensitive' } } } },
              { ticketReference: { contains: filters.ticketId, mode: 'insensitive' } },
              { agent: { name: { contains: filters.ticketId, mode: 'insensitive' } } },
            ]
          });
        }

        // 6. Security Boundaries
        if (role === 'AGENT') {
          conditions.push({ agentId: userId });
        } else if (restrictedRoles.includes(role)) {
          conditions.push({ campaignId: { in: assignedCampaignIds } });
        }

        return conditions.length === 1 ? conditions[0] : { AND: conditions };
      };

      const where = buildStatsWhere();

      // Execute queries using NATIVE DB AGGREGATIONS instead of in-memory loops
      const [aggregateResult, totalCount, passingCount, disputedCount] = await Promise.all([
        this.prisma.audit.aggregate({
          where,
          _sum: { score: true },
        }),
        this.prisma.audit.count({ where }),
        this.prisma.audit.count({
          where: { AND: [where, { score: { gte: 90 } }] },
        }),
        this.prisma.audit.count({
          where: {
            AND: [
              where,
              { status: { in: [AuditStatus.DISPUTED, AuditStatus.REAPPEALED] } },
            ],
          },
        }),
      ]);

      if (totalCount === 0) return this.getEmptyStats();

      const totalAudits = totalCount;
      // Use _sum / totalCount to match original behavior (null scores treated as 0)
      const avgScore = (aggregateResult._sum.score || 0) / totalAudits;
      const complianceRate = (passingCount / totalAudits) * 100;
      const disputeRate = (disputedCount / totalAudits) * 100;

      // Fetch lean audit data for trend and agent grouping (only needed fields)
      const audits = await this.prisma.audit.findMany({
        where,
        select: {
          id: true,
          agentId: true,
          score: true,
          status: true,
          submittedAt: true,
        },
      });

      // 2. Trend Data - Single Pass Grouping (O(N))
      const granularity = filters.granularity || 'day';
      let startDate = filters.startDate ? new Date(filters.startDate) : null;
      if (!startDate || isNaN(startDate.getTime())) {
        startDate = granularity === 'month' ? subDays(now, 365) : granularity === 'week' ? subDays(now, 90) : subDays(now, 13);
      }
      let endDate = filters.endDate ? new Date(filters.endDate) : now;
      if (isNaN(endDate.getTime())) endDate = now;

      let interval;
      try {
        if (startDate > endDate) {
          interval = [startDate]; // Default to start date if range is invalid
        } else if (granularity === 'month') {
          interval = eachMonthOfInterval({ start: startDate, end: endDate });
        } else if (granularity === 'week') {
          interval = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 0 });
        } else {
          interval = eachDayOfInterval({ start: startDate, end: endDate });
        }
      } catch (e) {
        console.warn('[DASHBOARD] Interval calculation failed, falling back to empty trend:', e.message);
        interval = [];
      }

      // Pre-calculate trend buckets for O(1) lookup
      const trendDataMap = new Map<string, { total: number; count: number }>();
      audits.forEach((a) => {
        if (!a.submittedAt) return;

        // CRITICAL FIX: Shift UTC timestamp to Local (UTC+8) for grouping
        // This ensures an audit at 3 AM UTC (11 AM Local) groups into the correct day.
        const localSubmittedAt = new Date(a.submittedAt.getTime() + (8 * 60 * 60 * 1000));
        
        let bucketKey;
        if (granularity === 'month') {
          bucketKey = format(localSubmittedAt, 'MMM yyyy');
        } else if (granularity === 'week') {
          bucketKey = format(startOfWeek(localSubmittedAt), 'MMM d');
        } else {
          bucketKey = format(localSubmittedAt, 'MMM dd');
        }

        const existing = trendDataMap.get(bucketKey) || { total: 0, count: 0 };
        trendDataMap.set(bucketKey, {
          total: existing.total + (a.score || 0),
          count: existing.count + 1,
        });
      });

      const trend = interval.map((date) => {
        let label;
        if (granularity === 'month') {
          label = format(date, 'MMM yyyy');
        } else if (granularity === 'week') {
          label = format(startOfWeek(date), 'MMM d');
        } else {
          label = format(date, 'MMM dd');
        }

        const stats = trendDataMap.get(label);
        return {
          date: label,
          avgScore: stats ? parseFloat((stats.total / stats.count).toFixed(2)) : null,
          count: stats ? stats.count : 0,
        };
      });

      // 3. Failure Categories Heatmap - NATIVE DB GROUP BY
      const categoryStats = await this.prisma.auditScore.groupBy({
        by: ['categoryLabel', 'criterionTitle'],
        where: {
          isFailed: true,
          audit: where,
        },
        _count: { _all: true },
      });

      const categoryAggregation: Record<string, { count: number; parameters: Record<string, number> }> = {};

      categoryStats.forEach((stat) => {
        const cat = (stat.categoryLabel || 'General').trim();
        const title = stat.criterionTitle || 'Unknown Parameter';
        
        if (!categoryAggregation[cat]) {
          categoryAggregation[cat] = { count: 0, parameters: {} };
        }
        categoryAggregation[cat].count += stat._count._all;
        categoryAggregation[cat].parameters[title] = (categoryAggregation[cat].parameters[title] || 0) + stat._count._all;
      });

      const failureHeatmap = Object.entries(categoryAggregation)
        .map(([name, data]) => ({
          name,
          value: data.count,
          parameters: Object.entries(data.parameters)
            .map(([pName, pValue]) => ({ name: pName, value: pValue }))
            .sort((a, b) => b.value - a.value),
        }))
        .sort((a, b) => b.value - a.value);

      // Agent Scores Aggregation - NATIVE DB GROUP BY
      const agentStats = await this.prisma.audit.groupBy({
        by: ['agentId'],
        where,
        _sum: { score: true },
        _count: { _all: true },
      });

      const agentIdsForNames = agentStats.map(s => s.agentId);
      const agents = await this.prisma.user.findMany({
        where: { id: { in: agentIdsForNames } },
        select: { id: true, name: true }
      });
      const agentMap = new Map(agents.map(a => [a.id, a.name]));

      const agentScores = agentStats.map((stat) => {
        return {
          agentId: stat.agentId,
          agentName: agentMap.get(stat.agentId) || 'Unknown Agent',
          auditCount: stat._count._all,
          avgScore: parseFloat(((stat._sum.score || 0) / stat._count._all).toFixed(2)),
        };
      });

      // Sort by average score descending
      agentScores.sort((a, b) => b.avgScore - a.avgScore);

      // 4. Zero Tolerance Policy Tracking
      let policyProgress = null;
      const activeProgressions = [];

      // Single Agent Detection Logic:
      const filteredAgentIds = this.normalizeArray(filters.agentId);
      let targetAgentId: string | null = null;
      if (filteredAgentIds.length === 1) {
        targetAgentId = filteredAgentIds[0];
      } else if (agentScores.length === 1) {
        targetAgentId = agentScores[0].agentId;
      } else if (role === 'AGENT' && userId) {
        targetAgentId = userId;
      }

      // Deduce if we have specific filters to apply to the monitor
      const campaignIds = this.normalizeArray(filters.campaignId);
      const agentIds = this.normalizeArray(filters.agentId);
      const supervisors = this.normalizeArray(filters.supervisor);
      const sdms = this.normalizeArray(filters.sdm);
      const auditorIds = this.normalizeArray(filters.auditorId);

      // For Management: Calculate all active progressions across the scope
      if (role !== 'AGENT') {
        // Fetch failures for agents in the CURRENT filtered scope.
        // We look back 365 days to ensure we have enough context for the rolling window,
        // but we restrict the "starting point" (the audits themselves) to the active filters.
        const bufferStartDate = subDays(startDate, 365);

        const allFailuresInScope = await this.prisma.auditScore.findMany({
          where: {
            isFailed: true,
            criterion: {
              categoryName: {
                not: 'Non-Critical',
                mode: 'insensitive',
              },
            },
            categoryLabel: {
              not: 'Non-Critical',
              mode: 'insensitive',
            },
            audit: {
              // SECURITY: Still respect assigned campaigns
              campaignId: campaignIds.length > 0 
                ? { in: campaignIds } 
                : (assignedCampaignIds.length > 0 ? { in: assignedCampaignIds } : undefined),
              
              // FILTERS: Respect the user's active selections
              ...(agentIds.length > 0 || supervisors.length > 0 || sdms.length > 0 ? {
                agent: {
                  ...(agentIds.length > 0 ? { id: { in: agentIds } } : {}),
                  ...(supervisors.length > 0 ? { supervisor: { in: supervisors } } : {}),
                  ...(sdms.length > 0 ? { sdm: { in: sdms } } : {}),
                }
              } : {}),
              ...(auditorIds.length > 0 ? { auditorId: { in: auditorIds } } : {}),

              submittedAt: { gte: bufferStartDate, lte: endDate },
              status: {
                in: [
                  'SUBMITTED',
                  'RELEASED',
                  'DISPUTED',
                  'REAPPEALED',
                  'ACKNOWLEDGED',
                ] as any,
              },
            },
          },
          select: {
            categoryLabel: true,
            criterionTitle: true,
            criterion: { select: { categoryName: true, title: true } },
            audit: {
              select: {
                agentId: true,
                submittedAt: true,
                agent: { select: { id: true, name: true, employeeTeam: true } },
                campaign: { select: { id: true, name: true, ztpMilestones: true, ztpWindowDays: true } },
              },
            },
          },
        });


        const groupedByAgentParam: Record<string, Record<string, any[]>> = {};
        allFailuresInScope.forEach((f) => {
          const agentId = f.audit.agentId;
          // Normalize parameter name for cross-version tracking
          const rawParam = (
            f.criterionTitle ||
            f.criterion?.title ||
            'General'
          );
          const paramStr = rawParam.trim();

          if (!groupedByAgentParam[agentId]) groupedByAgentParam[agentId] = {};
          if (!groupedByAgentParam[agentId][paramStr])
            groupedByAgentParam[agentId][paramStr] = [];
          groupedByAgentParam[agentId][paramStr].push(f);
        });


        for (const [agentId, params] of Object.entries(groupedByAgentParam)) {
          for (const [parameter, instances] of Object.entries(params)) {
            const sortedInstances = [...instances].sort(
              (a, b) =>
                new Date(b.audit.submittedAt).getTime() -
                new Date(a.audit.submittedAt).getTime(),
            );

            const latest = sortedInstances[0];
            const lastInfractionDate = new Date(latest.audit.submittedAt);
            const ztpWindowDays = latest.audit.campaign?.ztpWindowDays ?? 30;
            const windowStart = subDays(lastInfractionDate, ztpWindowDays);

            const count = instances.filter((i) => {
              const d = new Date(i.audit.submittedAt);
              return d >= windowStart && d <= lastInfractionDate;
            }).length;

            const milestones = (latest.audit.campaign?.ztpMilestones as number[]) ?? [3, 6, 9, 12, 15];
            const sortedMilestones = [...milestones].sort((a, b) => a - b);


            if (count >= sortedMilestones[0]) {
              let sanction = 'Written Warning';
              const hitIdx = [...sortedMilestones].reverse().findIndex((m) => count >= m);

              if (hitIdx === 0) sanction = 'Termination';
              else if (hitIdx === 1) sanction = 'Suspension (5 Days)';
              else if (hitIdx === 2) sanction = 'Suspension (3 Days)';
              else if (hitIdx === 3) sanction = 'Final Written Warning';
              else sanction = 'Written Warning';

              activeProgressions.push({
                agentId,
                agentName: latest.audit.agent?.name || (latest.audit as any).agent?.id || agentId || 'Unknown',
                teamName: latest.audit.agent?.employeeTeam || 'Direct Report',
                campaign: latest.audit.campaign?.name || 'N/A',
                category: (
                  latest.categoryLabel ||
                  latest.criterion?.categoryName ||
                  'General'
                ).trim(),
                parameter: (parameter || 'General').trim(),
                count,
                sanction,
                lastInfraction: lastInfractionDate,
              });
            }
          }
        }
        activeProgressions.sort((a, b) => b.count - a.count);
      }

      // Single Agent Result (for display on categories)
      if (targetAgentId) {
        const singleAgentId = targetAgentId;
        const agentFailures = await this.prisma.auditScore.findMany({
          where: {
            isFailed: true,
            criterion: {
              categoryName: {
                not: 'Non-Critical',
                mode: 'insensitive',
              },
            },
            categoryLabel: {
              not: 'Non-Critical',
              mode: 'insensitive',
            },
            audit: {
              agentId: singleAgentId,
              // FILTERS: Respect the user's active selections for the single agent view
              ...(campaignIds.length > 0 ? { campaignId: { in: campaignIds } } : {}),
              ...(auditorIds.length > 0 ? { auditorId: { in: auditorIds } } : {}),

              status: {
                in: [
                  'SUBMITTED',
                  'RELEASED',
                  'DISPUTED',
                  'REAPPEALED',
                  'ACKNOWLEDGED',
                ] as any,
              },
            },
          },
          include: {
            audit: { include: { campaign: true } },
            criterion: true
          }
        });

        // Security: If actually an agent, filter out non-released status artifacts (they only see released/acknowledged)
        const agentIdCheck = role;
        const filteredFailures = agentIdCheck === 'AGENT'
          ? agentFailures.filter(f => f.audit && f.audit.status !== 'SUBMITTED')
          : agentFailures;

        const failuresByParam: Record<string, any[]> = {};
        filteredFailures.forEach((f) => {
          const paramStr = (
            f.criterionTitle ||
            f.criterion?.title ||
            'General'
          ).trim();
          if (!failuresByParam[paramStr]) failuresByParam[paramStr] = [];
          failuresByParam[paramStr].push(f);
        });

        policyProgress = Object.entries(failuresByParam)
          .map(([parameter, instances]) => {
            const sortedInstances = [...instances].sort(
              (a, b) =>
                new Date(b.audit.submittedAt).getTime() -
                new Date(a.audit.submittedAt).getTime(),
            );
            const latest = sortedInstances[0];
            const lastInfractionDate = new Date(latest.audit.submittedAt);
            const ztpWindowDays = latest.audit.campaign?.ztpWindowDays ?? 30;
            const windowStart = subDays(lastInfractionDate, ztpWindowDays);
            const count = instances.filter((i) => {
              const d = new Date(i.audit.submittedAt);
              return d >= windowStart && d <= lastInfractionDate;
            }).length;

            const milestones = (latest.audit.campaign?.ztpMilestones as number[]) ?? [3, 6, 9, 12, 15];
            const sortedMilestones = [...milestones].sort((a, b) => a - b);

            let sanction = null;
            if (count >= sortedMilestones[0]) {
              const hitIdx = [...sortedMilestones].reverse().findIndex((m) => count >= m);
              if (hitIdx === 0) sanction = 'For Termination';
              else if (hitIdx === 1) sanction = 'For Suspension (5 Days)';
              else if (hitIdx === 2) sanction = 'For Suspension (3 Days)';
              else if (hitIdx === 3) sanction = 'For Final Written Warning';
              else sanction = 'For Written Warning';
            }

            return {
              category: (
                latest.categoryLabel ||
                latest.criterion?.categoryName ||
                'General'
              ).trim(),
              parameter: parameter.trim(),
              count,
              lastInfraction: lastInfractionDate,
              sanction,
              milestones: sortedMilestones,
              ztpWindowDays,
            };
          })
          .sort((a, b) => b.count - a.count);
      }

      return {
        summary: {
          totalAudits,
          avgScore: parseFloat(avgScore.toFixed(2)),
          complianceRate: parseFloat(complianceRate.toFixed(2)),
          disputeRate: parseFloat(disputeRate.toFixed(2)),
        },
        trend,
        failureHeatmap,
        agentScores,
        policyProgress,
        activeProgressions, // Optimized management roster view
        failedAudits: await this.prisma.audit.findMany({
          where: {
            ...where,
            scores: { some: { isFailed: true } },
          },
          take: 20,
          orderBy: { submittedAt: 'desc' },
          include: {
            agent: { select: { id: true, name: true, employeeTeam: true } },
            campaign: { select: { id: true, name: true } },
            sampledTicket: {
              include: { ticket: { select: { externalTicketId: true } } },
            },
            scores: {
              where: { isFailed: true },
              select: {
                comment: true,
                categoryLabel: true,
                criterionTitle: true,
                criterion: { select: { title: true, categoryName: true } },
              },
            },
            coachingLog: true,
          },
        }),
      };
    } catch (error) {
      console.error(`[DASHBOARD_STATS] ERROR for User ${user?.id || 'unknown'}:`, error?.message || 'Unknown error', error?.stack);
      return this.getEmptyStats();
    }
  }

  async getFilterOptions(user: any, filters: any = {}) {
    try {
      if (!user) return { campaigns: [], supervisors: [], sdms: [], agents: [], qas: [] };
      const role = String(user?.role || user?.roleName || '').toUpperCase();
      const userId = user?.id || user?.userId;
      
      if (!userId) return { campaigns: [], supervisors: [], sdms: [], agents: [], qas: [] };

      const isStaff = role !== 'AGENT';
      const isManagerRestricted = [
        'QA_TL',
        'QATL',
        'OPS_TL',
        'OPSTL',
        'OPS_MANAGER',
        'OPSMANAGER',
        'SDM',
        'QA',
      ].includes(role);

      console.log(
        `[DASHBOARD] getFilterOptions | User ID: ${userId} | role=${role} | restricted=${isManagerRestricted}`,
      );

      const activeCampaigns = this.normalizeArray(filters.campaignId);
      const activeSupervisors = this.normalizeArray(filters.supervisor);
      const activeSdms = this.normalizeArray(filters.sdm);

      // Determine allowed campaign IDs based on role
      let allowedCampaignIds: string[] | null = null; // null = no restriction

      if (isManagerRestricted) {
        const assignments = await this.prisma.campaignQA.findMany({
          where: { userId: userId, isActive: true },
          select: { campaignId: true },
        });
        const assignedIds = assignments.map((a) => a.campaignId);
        if (assignedIds.length === 0) {
          return { campaigns: [], supervisors: [], sdms: [], agents: [], qas: [] };
        }
        if (activeCampaigns.length > 0) {
          const realIds = activeCampaigns.filter(id => !id.startsWith('TEAM:'));
          allowedCampaignIds = realIds.filter(id => assignedIds.includes(id));
          if (allowedCampaignIds.length === 0) {
            return { campaigns: [], supervisors: [], sdms: [], agents: [], qas: [] };
          }
        } else {
          allowedCampaignIds = assignedIds;
        }
      }

      // Build agent-where using AND to avoid invalid Prisma queries
      const buildAgentWhere = (excludeFilters: string[] = []): any => {
        const conditions: any[] = [];

        // 1. Primary Restriction: Role-based or self-lookup
        if (allowedCampaignIds !== null) {
          // Strict: only show agents who have actually been audited in these campaigns
          conditions.push({ auditsReceived: { some: { campaignId: { in: allowedCampaignIds } } } });
        } else if (!isStaff) {
          conditions.push({ id: userId });
        } else {
          // Global Staff/Admin: also only show audited agents
          conditions.push({ auditsReceived: { some: {} } });
        }

        // 2. Cascading Filters: Apply selected filters from the UI
        if (activeCampaigns.length > 0 && !excludeFilters.includes('campaignId')) {
          const teamNames = activeCampaigns.filter(id => id.startsWith('TEAM:')).map(id => id.replace('TEAM:', ''));
          const realIds = activeCampaigns.filter(id => !id.startsWith('TEAM:'));
          const campaignOr: any[] = [];
          
          if (realIds.length > 0) {
            campaignOr.push({ auditsReceived: { some: { campaignId: { in: realIds } } } });
          }
          if (teamNames.length > 0) {
            // Teammate lookup also strictly requires audits
            campaignOr.push({ 
              AND: [
                { employeeTeam: { in: teamNames } },
                { auditsReceived: { some: {} } }
              ]
            });
          }
          
          if (campaignOr.length === 1) conditions.push(campaignOr[0]);
          else if (campaignOr.length > 1) conditions.push({ OR: campaignOr });
        }

        if (activeSupervisors.length > 0 && !excludeFilters.includes('supervisor')) {
          conditions.push({ supervisor: { in: activeSupervisors } });
        }
        if (activeSdms.length > 0 && !excludeFilters.includes('sdm')) {
          conditions.push({ sdm: { in: activeSdms } });
        }

        if (conditions.length === 0) return {};
        if (conditions.length === 1) return conditions[0];
        return { AND: conditions };
      };

      // For cross-filtering other dropdowns (Campaigns and QAs), we need to know what agents match
      // even IF we haven't selected a campaign yet.
      const agentMatchWhere = buildAgentWhere();

      // 1. Campaigns List: Show campaigns matching other filter criteria
      const campaignFilter: any = { type: 'USER' };
      if (isManagerRestricted) {
        campaignFilter.id = { in: (await this.prisma.campaignQA.findMany({
          where: { userId: userId, isActive: true },
          select: { campaignId: true },
        })).map(a => a.campaignId) };
      }
      
      const campaignCrossFilter = buildAgentWhere(['campaignId']);
      if (Object.keys(campaignCrossFilter).length > 0) {
        campaignFilter.audits = { some: { agent: campaignCrossFilter } };
      } else {
        campaignFilter.audits = { some: {} };
      }

      // 2. QA Filter: Only show those who conducted audits in the matching scope
      const qaFilter: any = {
        role: { in: ['QA', 'QA_TL', 'ADMIN'] as any },
        auditsConducted: { some: { agent: agentMatchWhere } }
      };

      // 2. Final scopes for each dropdown using proper exclusion for cascading
      const agentScope = buildAgentWhere(['agentId']);
      const supervisorScope = buildAgentWhere(['supervisor']);
      const sdmScope = buildAgentWhere(['sdm']);
      const teamScope = buildAgentWhere();

      // OPTIMIZATION: Instead of re-scanning all audits (RELATION SOME) for every dropdown,
      // we use the Assignments and User metadata which are much smaller and indexed.
      const [campaigns, supervisorsRaw, sdmsRaw, auditedAgents, userTeams, qas] = await Promise.all([
        // Campaigns: Use the deducded allowed list or all USER type campaigns
        this.prisma.campaign.findMany({
          where: campaignFilter,
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        // Supervisors List: Filtered by Campaign / SDM selection
        this.prisma.user.findMany({
          where: { 
            role: 'AGENT',
            ...supervisorScope,
            NOT: [{ supervisor: null }, { supervisor: 'N/A' }],
          },
          select: { supervisor: true },
          distinct: ['supervisor'],
        }),
        // SDMs List: Filtered by Campaign / Supervisor selection
        this.prisma.user.findMany({
          where: { 
            role: 'AGENT',
            ...sdmScope,
            NOT: [{ sdm: null }, { sdm: 'N/A' }],
          },
          select: { sdm: true },
          distinct: ['sdm'],
        }),
        // Agents List: Filtered by Campaign / Supervisor / SDM
        this.prisma.user.findMany({
          where: { role: 'AGENT' as any, ...agentScope },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
          take: 500,
        }),
        // Teams List: Cascaded
        this.prisma.user.findMany({
          where: { 
            ...teamScope, 
            NOT: [{ employeeTeam: null }, { employeeTeam: 'Unassigned' }] 
          },
          select: { employeeTeam: true },
          distinct: ['employeeTeam'],
        }),
        // QAs List: Filtered by those who conducted audits in this scope
        this.prisma.user.findMany({
          where: qaFilter,
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);

      const campaignNames = new Set(campaigns.map((c) => c.name.toLowerCase().trim()));
      const implicitCampaigns = userTeams
        .map((t) => t.employeeTeam?.trim())
        .filter((t) => t && t !== 'Unassigned' && !t.includes('No Team') && !campaignNames.has(t.toLowerCase()))
        .map((t) => ({ id: `TEAM:${t}`, name: t! }));

      return {
        campaigns: [...campaigns, ...implicitCampaigns].sort((a, b) =>
          (a.name || '').localeCompare(b.name || ''),
        ),
        supervisors: supervisorsRaw.map((s) => s.supervisor).filter(s => s && s !== 'N/A').sort() as string[],
        sdms: sdmsRaw.map((s) => s.sdm).filter(s => s && s !== 'N/A').sort() as string[],
        agents: auditedAgents,
        qas,
      };
    } catch (error) {
      console.error('[DASHBOARD] getFilterOptions ERROR:', error);
      return { campaigns: [], supervisors: [], sdms: [], agents: [], qas: [] };
    }
  }
  async getCoachingStats(filters: any, user: any) {
    try {
      if (!user) return this.getEmptyCoachingStats();
      const role = String(user?.role || user?.roleName || '').toUpperCase();
      const userId = user?.id || user?.userId;
      
      if (!userId) return this.getEmptyCoachingStats();

      const restrictedRoles = ['QA_TL', 'QATL', 'OPS_TL', 'OPSTL', 'OPS_MANAGER', 'OPSMANAGER', 'SDM', 'QA'];
      const now = new Date();

      // [MANDATORY ASSIGNMENT CHECK]
      let assignedCampaignIds: string[] = [];
      if (restrictedRoles.includes(role)) {
        const userAssignments = await this.prisma.campaignQA.findMany({
          where: { userId: userId, isActive: true },
          select: { campaignId: true },
        });
        assignedCampaignIds = userAssignments.map((a) => a.campaignId);
        if (assignedCampaignIds.length === 0) return this.getEmptyCoachingStats();
      }

      let requestedStart = subDays(now, 14);
      if (filters.startDate) {
        const d = new Date(filters.startDate);
        if (!isNaN(d.getTime())) requestedStart = d;
      }
      requestedStart = startOfDay(requestedStart);

      let requestedEnd = now;
      if (filters.endDate) {
        const d = new Date(filters.endDate);
        if (!isNaN(d.getTime())) requestedEnd = d;
      }
      requestedEnd = endOfDay(requestedEnd);

      // Final safety for interval methods
      if (requestedStart > requestedEnd) {
        requestedStart = startOfDay(requestedEnd);
      }

      const buildCoachingWhere = (): any => {
        const conditions: any[] = [
          { status: { in: [AuditStatus.RELEASED, AuditStatus.ACKNOWLEDGED] } },
          { releasedAt: { gte: requestedStart, lte: requestedEnd } }
        ];

        // 1. Role-based Security
        if (role === 'AGENT') {
          conditions.push({ agentId: userId });
        } else if (restrictedRoles.includes(role)) {
          conditions.push({ campaignId: { in: assignedCampaignIds } });
        }

        // 2. Campaign Selection
        const campaignIds = this.normalizeArray(filters.campaignId);
        if (campaignIds.length > 0) {
          const realIds = campaignIds.filter((id: string) => !id.startsWith('TEAM:'));
          if (realIds.length > 0) conditions.push({ campaignId: { in: realIds } });
          // Note: Team filtering for coaching is currently implicit via agent matching or could be added here
        }

        // 3. Auditor Selection
        const auditorIds = this.normalizeArray(filters.auditorId);
        if (auditorIds.length > 0) conditions.push({ auditorId: { in: auditorIds } });

        // 4. Agent/Supervisor Selection
        const agentIds = this.normalizeArray(filters.agentId);
        const supervisors = this.normalizeArray(filters.supervisor);
        if (agentIds.length > 0 || supervisors.length > 0) {
          conditions.push({
            agent: {
              ...(agentIds.length > 0 ? { id: { in: agentIds } } : {}),
              ...(supervisors.length > 0 ? { supervisor: { in: supervisors } } : {}),
            }
          });
        }

        return conditions.length === 1 ? conditions[0] : { AND: conditions };
      };

      const where = buildCoachingWhere();



      const audits = await this.prisma.audit.findMany({
        where,
        include: {
          agent: true,
          auditor: true,
          campaign: true,
          coachingLog: { include: { supervisor: true } },
        },
      });

      if (audits.length === 0) return this.getEmptyCoachingStats();


      const results = (await Promise.all(audits.map(async (rawAudit) => {
        try {
          const audit = rawAudit as any;
          const sentDate = new Date(audit.releasedAt!);
          const minTime = addHours(sentDate, 24);

          // 1. Release SLA (Supervisor Action: Audit Release -> Coaching Release)
          const releaseSlaDays = audit.campaign?.coachingReleaseWindowDays ?? 3;
          const releaseDeadlineDate = await this.slaEngine.calculateDueDate(sentDate, releaseSlaDays, audit.campaignId);
          const releaseDeadline = endOfDay(releaseDeadlineDate);

          // 2. Acknowledgment SLA (Agent Action: Coaching Release -> Agent Ack)
          const coachingDate = audit.coachingLog?.releasedAt ? new Date(audit.coachingLog.releasedAt) : null;
          const acknowledged = !!audit.coachingLog?.agentAckAt;
          const ackDate = audit.coachingLog?.agentAckAt ? new Date(audit.coachingLog.agentAckAt) : null;
          
          let ackDeadline = null;
          if (coachingDate) {
            const ackSlaDays = audit.campaign?.coachingAckWindowDays ?? 2;
            const ackDeadlineDate = await this.slaEngine.calculateDueDate(coachingDate, ackSlaDays, audit.campaignId);
            ackDeadline = endOfDay(ackDeadlineDate);
          }

          // 3. Completion SLA (Total Process: Audit Release -> Agent Ack)
          const completionSlaDays = audit.campaign?.coachingCompletionWindowDays ?? 5;
          const completionDeadlineDate = await this.slaEngine.calculateDueDate(sentDate, completionSlaDays, audit.campaignId);
          const completionDeadline = endOfDay(completionDeadlineDate);

          // 1. Supervisor Status (Audit Release -> Coaching Release)
          let supervisorStatus = 'Not Started';
          if (coachingDate) {
            if (coachingDate < minTime) supervisorStatus = 'Early';
            else if (coachingDate <= releaseDeadline) supervisorStatus = 'On-Time';
            else supervisorStatus = 'Late';
          } else {
            supervisorStatus = now > releaseDeadline ? 'Overdue' : 'Not Started';
          }

          // 2. Agent Status (Coaching Release -> Agent Ack)
          let agentStatus = 'Awaiting Release';
          if (acknowledged && coachingDate) {
            const minAckTime = addHours(coachingDate, 24);
            if (ackDate < minAckTime) agentStatus = 'Early';
            else if (ackDeadline && ackDate <= ackDeadline) agentStatus = 'On-Time';
            else agentStatus = 'Late';
          } else if (coachingDate) {
            agentStatus = (ackDeadline && now > ackDeadline) ? 'Overdue' : 'Pending';
          } else if (supervisorStatus === 'Overdue') {
            agentStatus = 'Overdue'; // Blocked by supervisor breach
          }

          // Comprehensive Breach Check
          const isReleaseBreached = supervisorStatus === 'Late' || supervisorStatus === 'Overdue';
          const isAckBreached = agentStatus === 'Late' || agentStatus === 'Overdue';
          const isBreached = isReleaseBreached || isAckBreached;

          const requiresCoaching = (audit.score || 0) < 100;

          return {
            id: audit.id,
            agentName: audit.agent.name,
            supervisorName: audit.agent.supervisor || audit.coachingLog?.supervisor?.name || 'Unknown',
            supervisorStatus,
            agentStatus,
            status: role === 'AGENT' ? agentStatus : supervisorStatus,
            isBreached,
            acknowledged,
            isReleased: !!coachingDate,
            sentDate,
            coachingDate,
            deadline: releaseDeadline,
            releaseDeadline,
            ackDeadline,
            completionDeadline,
            ticketReference: audit.ticketReference,
            score: audit.score,
            requiresCoaching,
            coachingType: requiresCoaching ? 'Required' : 'Feedback',
            agentAckAt: audit.coachingLog?.agentAckAt,
          };
        } catch (e) {
          return null;
        }
      }))).filter(Boolean) as any[];

      // Aggregators
      const agentMap = new Map();
      const supervisorMap = new Map();

      results.forEach(r => {
        if (!r.requiresCoaching) return; // Skip 100% audits for these metrics

        const isNotStarted = r.status === 'Not Started' && !r.isBreached;

        // Agent Table Stats - ONLY include items that are released or already breached
        if (!agentMap.has(r.agentName)) {
          agentMap.set(r.agentName, {
            name: r.agentName, total: 0, completed: 0, pending: 0, overdue: 0,
            early: 0, onTime: 0, late: 0, breached: 0, metricsTotal: 0
          });
        }

        if (!isNotStarted) {
          const a = agentMap.get(r.agentName);
          a.total++;
          a.metricsTotal++;

          if (r.acknowledged) a.completed++;
          else if (r.isReleased) {
            if (r.ackDeadline && now > r.ackDeadline) a.overdue++;
            else a.pending++;
          } else if (r.status === 'Overdue') {
            a.overdue++;
          }
          
          if (r.status !== 'Not Started') a.metricsTotal++;
          if (r.agentStatus === 'Early') a.early++;
          else if (r.agentStatus === 'On-Time') a.onTime++;
          else if (r.agentStatus === 'Late') a.late++;
          if (r.isBreached) a.breached++;
        }

        // Supervisor Table Stats
        const sName = role === 'AGENT' ? r.agentName : r.supervisorName;
        if (!supervisorMap.has(sName)) {
          supervisorMap.set(sName, {
            name: sName, total: 0, completed: 0, pending: 0, overdue: 0,
            early: 0, onTime: 0, late: 0, breached: 0, metricsTotal: 0
          });
        }
        const s = supervisorMap.get(sName);
        s.total++;

        if (r.acknowledged) s.completed++;
        else if (r.isReleased) {
          if (r.ackDeadline && now > r.ackDeadline) s.overdue++;
          else s.pending++;
        } else if (r.status === 'Overdue') {
          s.overdue++;
        } else {
          // Status is 'Not Started' - only pending if it's the supervisor accountability view
          // For an agent viewing their own performance, hide supervisor-pending items from 'Pending'
          if (role !== 'AGENT') s.pending++;
        }
        
        // Re-calculate Total for the table to exclude items the current user shouldn't see as 'pending'
        // This ensures Compliance = Completed / (Completed + Pending + Overdue) stays accurate to the context
        if (role === 'AGENT' && r.status === 'Not Started') {
          s.total--;
        }

        const currentStatus = role === 'AGENT' ? r.agentStatus : r.supervisorStatus;

        if (currentStatus === 'Early') s.early++;
        else if (currentStatus === 'On-Time') s.onTime++;
        else if (currentStatus === 'Late') s.late++;

        if (r.isBreached) s.breached++;
      });

      const supervisorAccountability = Array.from(supervisorMap.values()).map(s => {
        return {
          ...s,
          compliance: s.total > 0 ? (s.completed / s.total) * 100 : 100
        };
      }).sort((a, b) => a.compliance - b.compliance);

      const agentCoverage = Array.from(agentMap.values()).map(a => {
        return {
          ...a,
          complianceRate: a.total > 0 ? (a.completed / a.total) * 100 : 100
        };
      }).sort((a, b) => b.overdue - a.overdue);

      const mandatoryResults = results.filter(r => r.requiresCoaching && r.sentDate >= requestedStart && r.sentDate <= requestedEnd);
      const totalMandatory = mandatoryResults.length;
      
      const mCompleted = mandatoryResults.filter(r => r.acknowledged).length;
      const mPending = mandatoryResults.filter(r => r.isReleased && !r.acknowledged).length;
      const mOverdue = mandatoryResults.filter(r => r.status === 'Overdue').length;

      const earlyMandatory = mandatoryResults.filter(r => r.status === 'Early').length;
      const onTimeMandatory = mandatoryResults.filter(r => r.status === 'On-Time').length;
      const lateMandatory = mandatoryResults.filter(r => r.status === 'Late').length;

      const compliantMandatory = earlyMandatory + onTimeMandatory;
      const releasedMandatory = earlyMandatory + onTimeMandatory + lateMandatory;

      const supervisorAvg = supervisorAccountability.length > 0
        ? supervisorAccountability.reduce((sum, s) => sum + s.compliance, 0) / supervisorAccountability.length
        : 100;

      const complianceRate = supervisorAvg;
      const onTimeRate = releasedMandatory > 0 ? (compliantMandatory / releasedMandatory) * 100 : 0;

      const summary = {
        totalAudits: totalMandatory,
        completed: results.filter(r => r.requiresCoaching && r.acknowledged).length,
        pending: results.filter(r => {
          if (!r.requiresCoaching || r.acknowledged || r.isBreached) return false;
          return r.isReleased;
        }).length,
        complianceRate,
        onTimeRate,
        early: results.filter(r => r.requiresCoaching && r.status === 'Early').length,
        late: results.filter(r => r.requiresCoaching && r.status === 'Late').length,
        overdue: results.filter(r => r.requiresCoaching && !r.acknowledged && r.isBreached).length,
        notStarted: results.filter(r => r.requiresCoaching && r.status === 'Not Started' && !r.isBreached).length,
      };

      const overdueTracker = results
        .filter(r => r.requiresCoaching && !r.acknowledged && r.isBreached)
        .map(r => ({
          id: r.id,
          agentName: r.agentName,
          supervisorName: r.supervisorName,
          sentDate: r.sentDate,
          deadline: r.isReleased ? r.ackDeadline : r.releaseDeadline,
          hoursOverdue: Math.max(0, differenceInHours(now, r.isReleased ? r.ackDeadline : r.releaseDeadline)),
          ticketReference: r.ticketReference,
          breachType: r.isReleased ? 'Agent Acknowledgment' : 'Supervisor Release'
        }))
        .sort((a, b) => b.hoursOverdue - a.hoursOverdue);

      const pendingTracker = results
        .filter(r => r.requiresCoaching && r.isReleased && !r.acknowledged && !r.isBreached)
        .map(r => ({
          ...r,
          deadline: r.ackDeadline, // Override for Agent View
          hoursUntilOverdue: r.ackDeadline ? Math.max(0, differenceInHours(r.ackDeadline, now)) : 0
        }))
        .sort((a, b) => b.sentDate.getTime() - a.sentDate.getTime());

      const coachingActivity = results
        .filter(r => role === 'AGENT' ? r.isReleased : (r.requiresCoaching || r.isReleased))
        .map(r => ({
          ...r,
          deadline: r.acknowledged ? r.coachingDate : (r.isReleased ? r.ackDeadline : r.releaseDeadline),
          hoursOverdue: r.isBreached ? Math.max(0, differenceInHours(now, r.isReleased ? r.ackDeadline : r.releaseDeadline)) : 0
        }))
        .sort((a, b) => b.sentDate.getTime() - a.sentDate.getTime());

      // Activity Trend - Single Pass Grouping (O(N))
      const granularity = filters.granularity || 'day';
      let trendStart = filters.startDate ? new Date(filters.startDate) : null;
      if (!trendStart || isNaN(trendStart.getTime())) {
        trendStart = granularity === 'month' ? subDays(now, 365) : granularity === 'week' ? subDays(now, 90) : subDays(now, 14);
      }
      trendStart = startOfDay(trendStart);

      let trendEnd = filters.endDate ? new Date(filters.endDate) : now;
      if (isNaN(trendEnd.getTime())) trendEnd = now;
      trendEnd = endOfDay(trendEnd);

      let interval;
      try {
        if (trendStart > trendEnd) {
          interval = [trendStart];
        } else if (granularity === 'month') {
          interval = eachMonthOfInterval({ start: trendStart, end: trendEnd });
        } else if (granularity === 'week') {
          interval = eachWeekOfInterval({ start: trendStart, end: trendEnd }, { weekStartsOn: 0 }); // 0 = Sunday
        } else {
          interval = eachDayOfInterval({ start: trendStart, end: trendEnd });
        }
      } catch (e) {
        console.warn('[COACHING_STATS] Interval failed:', e.message);
        interval = [];
      }

      // Pre-calculate buckets
      const mandatoryTrendMap = new Map<string, number>();
      const optionalTrendMap = new Map<string, number>();

      results.forEach((r) => {
        if (!r.coachingDate) return;
        const d = r.coachingDate instanceof Date ? r.coachingDate : new Date(r.coachingDate);
        
        let bucketKey;
        if (granularity === 'month') {
          bucketKey = format(d, 'MMM yyyy');
        } else if (granularity === 'week') {
          bucketKey = `Week of ${format(startOfWeek(d, { weekStartsOn: 0 }), 'MMM d')}`;
        } else {
          bucketKey = format(d, 'MMM dd');
        }

        if (r.requiresCoaching) {
          mandatoryTrendMap.set(bucketKey, (mandatoryTrendMap.get(bucketKey) || 0) + 1);
        } else {
          optionalTrendMap.set(bucketKey, (optionalTrendMap.get(bucketKey) || 0) + 1);
        }
      });

      const mandatoryActivityTrend = interval.map((date) => {
        let label;
        if (granularity === 'month') {
          label = format(date, 'MMM yyyy');
        } else if (granularity === 'week') {
          label = `Week of ${format(startOfWeek(date, { weekStartsOn: 0 }), 'MMM d')}`;
        } else {
          label = format(date, 'MMM dd');
        }
        return { date: label, count: mandatoryTrendMap.get(label) || 0 };
      });

      const optionalActivityTrend = interval.map((date) => {
        let label;
        if (granularity === 'month') {
          label = format(date, 'MMM yyyy');
        } else if (granularity === 'week') {
          label = `Week of ${format(startOfWeek(date, { weekStartsOn: 0 }), 'MMM d')}`;
        } else {
          label = format(date, 'MMM dd');
        }
        return { date: label, count: optionalTrendMap.get(label) || 0 };
      });

      return {
        summary,
        timelinessBreakdown: [
          { name: 'Early', value: results.filter(r => (role === 'AGENT' ? r.agentStatus : r.supervisorStatus) === 'Early').length },
          { name: 'On-Time', value: results.filter(r => (role === 'AGENT' ? r.agentStatus : r.supervisorStatus) === 'On-Time').length },
          { name: 'Late', value: results.filter(r => (role === 'AGENT' ? r.agentStatus : r.supervisorStatus) === 'Late').length },
          { name: 'Overdue', value: results.filter(r => r.requiresCoaching && !r.acknowledged && r.isBreached).length },
          { name: 'Not Started', value: results.filter(r => r.requiresCoaching && r.supervisorStatus === 'Not Started' && !r.isBreached).length },
        ],
        supervisorAccountability,
        agentCoverage,
        overdueTracker,
        pendingTracker,
        mandatoryActivityTrend,
        optionalActivityTrend,
        activityTrend: mandatoryActivityTrend.map((m, i) => ({
          date: m.date,
          count: m.count + (optionalActivityTrend[i]?.count || 0)
        })),
        coachingActivity,
      };
    } catch (error) {
      console.error('[COACHING_STATS] ERROR:', error);
      throw error;
    }
  }

  // Consistent helper for array inputs
  private normalizeArray(val: any): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    if (typeof val === 'string' && val.includes(',')) {
      return val.split(',').map(v => v.trim()).filter(Boolean);
    }
    return [String(val).trim()].filter(Boolean);
  }

  private getEmptyCoachingStats() {
    return {
      summary: {
        totalAudits: 0,
        completed: 0,
        complianceRate: 0,
        onTimeRate: 0,
        early: 0,
        late: 0,
        overdue: 0,
        notStarted: 0,
        pending: 0,
      },
      timelinessBreakdown: [],
      supervisorAccountability: [],
      agentCoverage: [],
      overdueTracker: [],
      pendingTracker: [],
      mandatoryActivityTrend: [],
      optionalActivityTrend: [],
      activityTrend: [],
      coachingActivity: [],
    };
  }

  private getEmptyStats() {
    return {
      summary: {
        totalAudits: 0,
        avgScore: 0,
        complianceRate: 0,
        disputeRate: 0,
      },
      trend: [],
      failureHeatmap: [],
      agentScores: [],
      policyProgress: [],
      activeProgressions: [],
      failedAudits: [],
    };
  }
}
