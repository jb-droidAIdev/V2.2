import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditStatus, Role } from '@prisma/client';
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    async getStats(filters: {
        startDate?: string;
        endDate?: string;
        agentName?: string;
        campaignId?: string | string[];
        supervisor?: string | string[];
        sdm?: string | string[];
        auditorId?: string | string[];
        granularity?: 'day' | 'week' | 'month';
    }, user: any) {
        let where: any = {
            status: { in: [AuditStatus.SUBMITTED, AuditStatus.RELEASED, AuditStatus.DISPUTED, AuditStatus.REAPPEALED] }
        };

        // Date Range
        if (filters.startDate || filters.endDate) {
            where.submittedAt = {};
            if (filters.startDate) where.submittedAt.gte = new Date(filters.startDate);
            if (filters.endDate) where.submittedAt.lte = endOfDay(new Date(filters.endDate));
        }

        // Campaign(s)
        if (filters.campaignId) {
            const campaignIds = Array.isArray(filters.campaignId)
                ? filters.campaignId
                : filters.campaignId.split(',').filter(Boolean);

            if (campaignIds.length > 0) {
                const teamNames = campaignIds
                    .filter(id => id.startsWith('TEAM:'))
                    .map(id => id.replace('TEAM:', ''));
                const realCampaignIds = campaignIds.filter(id => !id.startsWith('TEAM:'));

                let campaignConditions = [];
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

        // Auditor(s)
        if (filters.auditorId) {
            const auditorIds = Array.isArray(filters.auditorId)
                ? filters.auditorId
                : filters.auditorId.split(',').filter(Boolean);
            if (auditorIds.length > 0) {
                where.auditorId = { in: auditorIds };
            }
        }

        // Complex filters (Agent, Supervisor, SDM)
        if (filters.agentName || filters.supervisor || filters.sdm) {
            where.agent = where.agent || {};
            if (filters.agentName) {
                where.agent.name = { contains: filters.agentName, mode: 'insensitive' };
            }

            if (filters.supervisor) {
                const supervisors = Array.isArray(filters.supervisor)
                    ? filters.supervisor
                    : filters.supervisor.split(',').filter(Boolean);
                if (supervisors.length > 0) {
                    where.agent.supervisor = { in: supervisors };
                }
            }

            if (filters.sdm) {
                const sdms = Array.isArray(filters.sdm)
                    ? filters.sdm
                    : filters.sdm.split(',').filter(Boolean);
                if (sdms.length > 0) {
                    where.agent.sdm = { in: sdms };
                }
            }
        }

        // Role-based visibility
        if (user.role === Role.AGENT) {
            where.agentId = user.id;
        } else if ([Role.QA_TL, Role.OPS_TL].includes(user.role)) {
            // Simplified: visibility based on their own team if they have one
            if (user.employeeTeam) {
                where.agent = { ...where.agent, employeeTeam: user.employeeTeam };
            }
        }

        // 1. Basic Stats
        const audits = await this.prisma.audit.findMany({
            where,
            select: {
                id: true,
                score: true,
                status: true,
                submittedAt: true,
            }
        });

        const totalAudits = audits.length;
        const avgScore = totalAudits > 0
            ? audits.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalAudits
            : 0;

        const complianceRate = audits.length > 0
            ? (audits.filter(a => (a.score || 0) >= 90).length / audits.length) * 100
            : 0;

        const disputedCount = audits.filter(a => a.status === AuditStatus.DISPUTED || a.status === AuditStatus.REAPPEALED).length;
        const disputeRate = totalAudits > 0 ? (disputedCount / totalAudits) * 100 : 0;

        // 2. Trend Data
        const granularity = filters.granularity || 'day';
        const now = new Date();
        // Default ranges if not provided
        const startDate = filters.startDate ? new Date(filters.startDate) :
            granularity === 'month' ? subDays(now, 365) :
                granularity === 'week' ? subDays(now, 90) :
                    subDays(now, 13);
        const endDate = filters.endDate ? new Date(filters.endDate) : now;

        let interval;
        if (granularity === 'month') {
            interval = eachMonthOfInterval({ start: startDate, end: endDate });
        } else if (granularity === 'week') {
            interval = eachWeekOfInterval({ start: startDate, end: endDate });
        } else {
            interval = eachDayOfInterval({ start: startDate, end: endDate });
        }

        const trend = interval.map(date => {
            let start, end, label;

            if (granularity === 'month') {
                start = startOfMonth(date);
                end = endOfMonth(date);
                label = format(date, 'MMM yyyy');
            } else if (granularity === 'week') {
                start = startOfWeek(date);
                end = endOfWeek(date);
                label = format(start, 'MMM d');
            } else {
                start = startOfDay(date);
                end = endOfDay(date);
                label = format(date, 'MMM dd');
            }

            const periodAudits = audits.filter(a => a.submittedAt && a.submittedAt >= start && a.submittedAt <= end);

            return {
                date: label,
                avgScore: periodAudits.length > 0
                    ? parseFloat((periodAudits.reduce((acc, curr) => acc + (curr.score || 0), 0) / periodAudits.length).toFixed(2))
                    : null,
                count: periodAudits.length
            };
        });

        // 3. Failure Categories Heatmap
        const failedScores = await this.prisma.auditScore.findMany({
            where: {
                isFailed: true,
                audit: where
            },
            include: {
                criterion: { select: { categoryName: true, title: true } }
            }
        });

        const categoryAggregation = failedScores.reduce((acc, curr) => {
            const cat = curr.criterion?.categoryName || 'General';
            const title = curr.criterion?.title || 'Unknown Parameter';

            if (!acc[cat]) {
                acc[cat] = { count: 0, parameters: {} as Record<string, number> };
            }
            acc[cat].count += 1;
            acc[cat].parameters[title] = (acc[cat].parameters[title] || 0) + 1;
            return acc;
        }, {} as Record<string, { count: number; parameters: Record<string, number> }>);

        const failureHeatmap = Object.entries(categoryAggregation)
            .map(([name, data]) => ({
                name,
                value: data.count,
                parameters: Object.entries(data.parameters)
                    .map(([pName, pValue]) => ({ name: pName, value: pValue }))
                    .sort((a, b) => b.value - a.value)
            }))
            .sort((a, b) => b.value - a.value);

        return {
            summary: {
                totalAudits,
                avgScore: parseFloat(avgScore.toFixed(2)),
                complianceRate: parseFloat(complianceRate.toFixed(2)),
                disputeRate: parseFloat(disputeRate.toFixed(2))
            },
            trend,
            failureHeatmap,
            failedAudits: await this.prisma.audit.findMany({
                where: {
                    ...where,
                    scores: {
                        some: {
                            isFailed: true
                        }
                    }
                },
                take: 20,
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
            })
        };
    }

    async getFilterOptions() {
        // Fetch values for filter dropdowns
        const [campaigns, supervisors, sdms, qas, userTeams] = await Promise.all([
            this.prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            this.prisma.user.findMany({ where: { supervisor: { not: null } }, select: { supervisor: true }, distinct: ['supervisor'] }),
            this.prisma.user.findMany({ where: { sdm: { not: null } }, select: { sdm: true }, distinct: ['sdm'] }),
            this.prisma.user.findMany({ where: { role: { in: [Role.QA, Role.QA_TL] } }, select: { id: true, name: true } }),
            this.prisma.user.findMany({ select: { employeeTeam: true }, distinct: ['employeeTeam'] }),
        ]);

        const campaignNames = new Set(campaigns.map(c => c.name.toLowerCase().trim()));
        const implicitCampaigns = userTeams
            .map(t => t.employeeTeam?.trim())
            .filter(t => t && t !== 'Unassigned' && !campaignNames.has(t.toLowerCase()))
            .map(t => ({ id: `TEAM:${t}`, name: t }));

        return {
            campaigns: [...campaigns, ...implicitCampaigns].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
            supervisors: supervisors.map(s => s.supervisor).filter(Boolean).sort(),
            sdms: sdms.map(s => s.sdm).filter(Boolean).sort(),
            qas
        };
    }
}
