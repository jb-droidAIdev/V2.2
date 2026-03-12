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

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

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
      const role = String(user.role || '').toUpperCase();
      const isStaff = role !== 'AGENT';

      const { where } = await this.buildWhereClause(filters, user, role, isStaff);
      if (!where) return this.getEmptyStats();

      // Execute queries
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

      if (audits.length === 0) return this.getEmptyStats();

      const totalAudits = audits.length;
      let totalScoreSum = 0;
      let passingAudits = 0;
      let disputedCount = 0;

      audits.forEach((a) => {
        totalScoreSum += a.score || 0;
        if ((a.score || 0) >= 90) passingAudits++;
        if (a.status === AuditStatus.DISPUTED) disputedCount++;
      });

      const avgScore = totalAudits > 0 ? totalScoreSum / totalAudits : 0;
      const complianceRate = totalAudits > 0 ? (passingAudits / totalAudits) * 100 : 0;
      const disputeRate = totalAudits > 0 ? (disputedCount / totalAudits) * 100 : 0;

      // Trend Calculation
      const granularity = filters.granularity || 'day';
      let trendStart: Date;
      let trendEnd: Date;

      if (filters.startDate && filters.endDate) {
        trendStart = startOfDay(new Date(filters.startDate));
        trendEnd = endOfDay(new Date(filters.endDate));
      } else {
        trendEnd = now();
        trendStart = subDays(trendEnd, 30);
      }

      let interval: Date[];
      if (granularity === 'month') {
        interval = eachMonthOfInterval({ start: trendStart, end: trendEnd });
      } else if (granularity === 'week') {
        interval = eachWeekOfInterval({ start: trendStart, end: trendEnd });
      } else {
        interval = eachDayOfInterval({ start: trendStart, end: trendEnd });
      }

      const trend = interval.map((date) => {
        let label: string;
        let periodAudits: any[];

        if (granularity === 'month') {
          label = format(date, 'MMM yyyy');
          periodAudits = audits.filter((a) => {
            const d = new Date(a.submittedAt!);
            return d >= startOfMonth(date) && d <= endOfMonth(date);
          });
        } else if (granularity === 'week') {
          label = `Week of ${format(startOfWeek(date), 'MMM d')}`;
          periodAudits = audits.filter((a) => {
            const d = new Date(a.submittedAt!);
            return d >= startOfWeek(date) && d <= endOfWeek(date);
          });
        } else {
          label = format(date, 'MMM d');
          periodAudits = audits.filter((a) => isSameDay(new Date(a.submittedAt!), date));
        }

        const count = periodAudits.length;
        const sum = periodAudits.reduce((s, a) => s + (a.score || 0), 0);
        return {
          date: label,
          score: count > 0 ? sum / count : 0,
          count,
        };
      });

      return {
        summary: {
          totalAudits,
          avgScore,
          complianceRate,
          disputeRate,
        },
        trend,
        failureHeatmap: [], // Will be implemented if needed
        agentScores: [], // Simplified for now
        policyProgress: [],
        activeProgressions: [],
        failedAudits: [],
      };
    } catch (error) {
      console.error('[DASHBOARD] getStats ERROR:', error);
      return this.getEmptyStats();
    }
  }

  async getCoachingStats(filters: any, user: any) {
    try {
      const role = String(user.role || '').toUpperCase();
      const restrictedRoles = ['QA_TL', 'QATL', 'OPS_TL', 'OPSTL', 'OPS_MANAGER', 'OPSMANAGER', 'SDM', 'QA'];
      const now = new Date();

      // [MANDATORY ASSIGNMENT CHECK]
      let assignedCampaignIds: string[] = [];
      if (restrictedRoles.includes(role)) {
        const userAssignments = await this.prisma.campaignQA.findMany({
          where: { userId: user.id, isActive: true },
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

      const where: any = {
        status: { in: [AuditStatus.RELEASED, AuditStatus.ACKNOWLEDGED] },
        releasedAt: { gte: requestedStart, lte: requestedEnd },
      };

      if (role === 'AGENT') {
        where.agentId = user.id;
      } else if (restrictedRoles.includes(role)) {
        where.campaignId = { in: assignedCampaignIds };
      }

      const campaignIds = this.normalizeArray(filters.campaignId);
      if (campaignIds.length > 0) {
        const realIds = campaignIds.filter((id: string) => !id.startsWith('TEAM:'));
        if (realIds.length > 0) where.campaignId = { in: realIds };
      }

      const auditorIds = this.normalizeArray(filters.auditorId);
      if (auditorIds.length > 0) where.auditorId = { in: auditorIds };

      const agentIds = this.normalizeArray(filters.agentId);
      const supervisors = this.normalizeArray(filters.supervisor);
  
      if (agentIds.length > 0 || supervisors.length > 0) {
        where.agent = {
          ...(agentIds.length > 0 ? { id: { in: agentIds } } : {}),
          ...(supervisors.length > 0 ? { supervisor: { in: supervisors } } : {}),
        };
      }

      const audits = await this.prisma.audit.findMany({
        where,
        include: {
          agent: true,
          auditor: true,
          coachingLog: { include: { supervisor: true } },
        },
      });

      if (audits.length === 0) return this.getEmptyCoachingStats();

      const results = audits.map((audit) => {
        try {
          const sentDate = new Date(audit.releasedAt!);
          const minTime = addHours(sentDate, 24);

          // SLA: 2 Business Days (Due by End of Day)
          let deadline = endOfDay(sentDate);
          let bizDays = 0;
          while (bizDays < 2) {
            deadline = addDays(deadline, 1);
            if (!isWeekend(deadline)) bizDays++;
          }
          deadline = endOfDay(deadline);

          const coachingDate = audit.coachingLog?.releasedAt ? new Date(audit.coachingLog.releasedAt) : null;
          const acknowledged = !!audit.coachingLog?.agentAckAt;

          let status = 'Not Started';
          if (coachingDate) {
            if (coachingDate < minTime) status = 'Early';
            else if (coachingDate <= deadline) status = 'On-Time';
            else status = 'Late';
          } else {
            status = now > deadline ? 'Overdue' : 'Not Started';
          }

          const isBreached = status === 'Late' || status === 'Overdue';
          const requiresCoaching = (audit.score || 0) < 100;

          return {
            id: audit.id,
            agentName: audit.agent.name,
            supervisorName: audit.agent.supervisor || audit.coachingLog?.supervisor?.name || 'Unknown',
            status,
            isBreached,
            acknowledged,
            isReleased: !!coachingDate,
            sentDate,
            coachingDate,
            deadline,
            ticketReference: audit.ticketReference,
            score: audit.score,
            requiresCoaching,
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean) as any[];

      // Aggregators
      const agentMap = new Map();
      const supervisorMap = new Map();

      results.forEach(r => {
        if (!r.requiresCoaching) return; // Skip 100% audits for these metrics

        // Agent Table Stats
        if (!agentMap.has(r.agentName)) {
          agentMap.set(r.agentName, {
            name: r.agentName, total: 0, completed: 0, pending: 0, overdue: 0,
            early: 0, onTime: 0, late: 0, breached: 0, metricsTotal: 0
          });
        }
        const a = agentMap.get(r.agentName);
        a.total++;
        a.metricsTotal++;

        if (r.acknowledged) a.completed++;
        else if (r.isReleased) a.pending++;
        else if (r.status === 'Overdue') a.overdue++;

        if (r.status !== 'Not Started') a.metricsTotal++;

        if (r.status === 'Early') a.early++;
        else if (r.status === 'On-Time') a.onTime++;
        else if (r.status === 'Late') a.late++;

        if (r.isBreached) a.breached++;

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
        else if (r.isReleased) s.pending++;
        else if (r.status === 'Overdue') s.overdue++;

        if (r.status !== 'Not Started') s.metricsTotal++;

        if (r.status === 'Early') s.early++;
        else if (r.status === 'On-Time') s.onTime++;
        else if (r.status === 'Late') s.late++;

        if (r.isBreached) s.breached++;
      });

      const supervisorAccountability = Array.from(supervisorMap.values()).map(s => {
        return {
          ...s,
          compliance: s.total > 0 ? ((s.completed + s.pending) / s.total) * 100 : 100
        };
      }).sort((a, b) => a.compliance - b.compliance);

      const agentCoverage = Array.from(agentMap.values()).map(a => {
        const denom = a.pending + a.overdue;
        return {
          ...a,
          complianceRate: denom > 0 ? (a.completed / denom) * 100 : 100
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
        pending: results.filter(r => r.requiresCoaching && r.isReleased && !r.acknowledged).length,
        complianceRate,
        onTimeRate,
        early: results.filter(r => r.requiresCoaching && r.status === 'Early').length,
        late: results.filter(r => r.requiresCoaching && r.status === 'Late').length,
        overdue: results.filter(r => r.requiresCoaching && r.status === 'Overdue').length,
        notStarted: results.filter(r => r.requiresCoaching && r.status === 'Not Started').length,
      };

      const overdueTracker = results
        .filter(r => r.requiresCoaching && r.status === 'Overdue')
        .map(r => ({
          id: r.id,
          agentName: r.agentName,
          supervisorName: r.supervisorName,
          sentDate: r.sentDate,
          deadline: r.deadline,
          hoursOverdue: Math.max(0, differenceInHours(now, r.deadline)),
          ticketReference: r.ticketReference
        }))
        .sort((a, b) => b.hoursOverdue - a.hoursOverdue);

      const pendingTracker = results
        .filter(r => r.requiresCoaching && r.isReleased && !r.acknowledged)
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
          { name: 'Early', value: results.filter(r => r.status === 'Early').length },
          { name: 'On-Time', value: results.filter(r => r.status === 'On-Time').length },
          { name: 'Late', value: results.filter(r => r.status === 'Late').length },
          { name: 'Overdue', value: results.filter(r => r.status === 'Overdue' && r.requiresCoaching).length },
          { name: 'Not Started', value: results.filter(r => r.status === 'Not Started' && r.requiresCoaching).length },
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
      };
    } catch (error) {
      console.error('[COACHING_STATS] ERROR:', error);
      throw error;
    }
  }

  async getFilterOptions(user: any, filters: any = {}) {
    try {
      const role = String(user.role || '').toUpperCase();
      const isStaff = role !== 'AGENT';

      const { where } = await this.buildWhereClause(filters, user, role, isStaff);
      if (!where) {
        return { campaigns: [], supervisors: [], sdms: [], agents: [], qas: [] };
      }

      // 1. Get all unique combinations from matching audits
      const auditSummaries = await this.prisma.audit.findMany({
        where,
        select: {
          campaignId: true,
          auditorId: true,
          agentId: true,
        },
        distinct: ['campaignId', 'auditorId', 'agentId'],
      });

      if (auditSummaries.length === 0) {
        return { campaigns: [], supervisors: [], sdms: [], agents: [], qas: [] };
      }

      const campaignIds = Array.from(new Set(auditSummaries.map((a) => a.campaignId)));
      const auditorIds = Array.from(new Set(auditSummaries.map((a) => a.auditorId)));
      const agentIds = Array.from(new Set(auditSummaries.map((a) => a.agentId)));

      // 2. Fetch Details in parallel
      const [campaigns, agents, auditors] = await Promise.all([
        this.prisma.campaign.findMany({
          where: { id: { in: campaignIds }, isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.user.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true, supervisor: true, sdm: true, employeeTeam: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.user.findMany({
          where: { id: { in: auditorIds } },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      ]);

      // 3. Extract unique Supervisors, SDMs, and Teams from Agent details
      const supervisors = Array.from(new Set(agents.map((a) => a.supervisor).filter(Boolean))).sort();
      const sdms = Array.from(new Set(agents.map((a) => a.sdm).filter(Boolean))).sort();
      const userTeams = Array.from(new Set(agents.map((a) => a.employeeTeam).filter(Boolean)));

      const campaignNames = new Set(campaigns.map((c) => c.name.toLowerCase().trim()));
      const implicitCampaigns = userTeams
        .filter((t) => t && t !== 'Unassigned' && !campaignNames.has(t.toLowerCase().trim()))
        .map((t) => ({ id: `TEAM:${t}`, name: t }));

      return {
        campaigns: [...campaigns, ...implicitCampaigns].sort((a, b) =>
          (a.name || '').localeCompare(b.name || ''),
        ),
        supervisors,
        sdms,
        agents: agents.map((a) => ({ id: a.id, name: a.name })),
        qas: auditors,
      };
    } catch (error) {
      console.error('[DASHBOARD] getFilterOptions ERROR:', error);
      throw error;
    }
  }

  private async buildWhereClause(filters: any, user: any, role: string, isStaff: boolean) {
    const restrictedRoles = ['QA_TL', 'QATL', 'OPS_TL', 'OPSTL', 'OPS_MANAGER', 'OPSMANAGER', 'SDM', 'QA'];
    let assignedCampaignIds: string[] = [];
    if (restrictedRoles.includes(role)) {
      const userAssignments = await this.prisma.campaignQA.findMany({
        where: { userId: user.id, isActive: true },
        select: { campaignId: true },
      });
      assignedCampaignIds = userAssignments.map((a) => a.campaignId);
      if (assignedCampaignIds.length === 0) return { where: null, assignedCampaignIds: [] };
    }

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
      agent: {},
    };

    if (role === 'AGENT') {
      where.status.in = where.status.in.filter((s) => s !== AuditStatus.SUBMITTED);
      where.agentId = user.id;
    } else if (restrictedRoles.includes(role)) {
      const campaignIds = this.normalizeArray(filters.campaignId);
      if (campaignIds.length > 0) {
        const requested = campaignIds.filter(id => !id.startsWith('TEAM:'));
        const intersected = requested.filter(id => assignedCampaignIds.includes(id));
        if (intersected.length === 0 && requested.length > 0) return { where: null, assignedCampaignIds };
        if (intersected.length > 0) where.campaignId = { in: intersected };
        else where.campaignId = { in: assignedCampaignIds };
      } else {
        where.campaignId = { in: assignedCampaignIds };
      }
    } else if (!isStaff) {
      where.agent.employeeTeam = user.employeeTeam;
    }

    // Date Range
    if (filters.startDate || filters.endDate) {
      where.submittedAt = {};
      if (filters.startDate) {
        const sd = new Date(filters.startDate);
        if (!isNaN(sd.getTime())) where.submittedAt.gte = sd;
      }
      if (filters.endDate) {
        const ed = new Date(filters.endDate);
        if (!isNaN(ed.getTime())) where.submittedAt.lte = endOfDay(ed);
      }
      if (Object.keys(where.submittedAt).length === 0) delete where.submittedAt;
    }

    // Campaigns & Teams (if not handled by restrictedRoles)
    if (!restrictedRoles.includes(role)) {
      const campaignIds = this.normalizeArray(filters.campaignId);
      if (campaignIds.length > 0) {
        const teamNames = campaignIds.filter((id) => id.startsWith('TEAM:')).map((id) => id.replace('TEAM:', ''));
        const realIds = campaignIds.filter((id) => !id.startsWith('TEAM:'));
        const campaignConditions = [];
        if (realIds.length > 0) campaignConditions.push({ campaignId: { in: realIds } });
        if (teamNames.length > 0) campaignConditions.push({ agent: { employeeTeam: { in: teamNames } } });

        if (campaignConditions.length > 1) where.OR = campaignConditions;
        else if (campaignConditions.length === 1) {
          const cond = campaignConditions[0];
          if (cond.campaignId) where.campaignId = cond.campaignId;
          if (cond.agent) where.agent = { ...where.agent, ...cond.agent };
        }
      }
    }

    // Auditor(s)
    const auditorIds = this.normalizeArray(filters.auditorId);
    if (auditorIds.length > 0) where.auditorId = { in: auditorIds };

    // Agent Selection
    const agentIds = this.normalizeArray(filters.agentId);
    if (agentIds.length > 0) where.agent.id = { in: agentIds };

    // Agent Name
    if (filters.agentName) where.agent.name = { contains: filters.agentName, mode: 'insensitive' };

    // Supervisor/SDM
    const supervisors = this.normalizeArray(filters.supervisor);
    if (supervisors.length > 0) where.agent.supervisor = { in: supervisors };

    const sdms = this.normalizeArray(filters.sdm);
    if (sdms.length > 0) where.agent.sdm = { in: sdms };

    // Ticket ID
    if (filters.ticketId) {
      const ticketCondition = {
        OR: [
          { sampledTicket: { ticket: { externalTicketId: { contains: filters.ticketId, mode: 'insensitive' } } } },
          { ticketReference: { contains: filters.ticketId, mode: 'insensitive' } },
          { agent: { name: { contains: filters.ticketId, mode: 'insensitive' } } },
        ],
      };
      if (where.OR) {
        const existingOR = where.OR;
        delete where.OR;
        where.AND = [{ OR: existingOR }, ticketCondition];
      } else {
        where.OR = ticketCondition.OR;
      }
    }

    if (Object.keys(where.agent).length === 0) delete where.agent;

    return { where, assignedCampaignIds };
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

function now(): Date {
  return new Date();
}
