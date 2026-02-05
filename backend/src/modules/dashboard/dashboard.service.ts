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
        agentId?: string | string[];
        ticketId?: string;
        campaignId?: string | string[];
        supervisor?: string | string[];
        sdm?: string | string[];
        auditorId?: string | string[];
        granularity?: 'day' | 'week' | 'month';
    }, user: any) {
        const where: any = {
            status: { in: [AuditStatus.SUBMITTED, AuditStatus.RELEASED, AuditStatus.DISPUTED, AuditStatus.REAPPEALED] }
        };

        // Initialize agent filter object early to support merging
        where.agent = {};

        // Helper to normalize input (handle both ?key=1,2 and multiple ?key=1&key=2)
        const normalizeArray = (val: any) => {
            if (!val) return [];
            return Array.isArray(val) ? val : val.split(',').filter(Boolean);
        };

        // 1. Date Range
        if (filters.startDate || filters.endDate) {
            where.submittedAt = {};
            if (filters.startDate) where.submittedAt.gte = new Date(filters.startDate);
            if (filters.endDate) where.submittedAt.lte = endOfDay(new Date(filters.endDate));
        }

        // 2. Campaigns & Teams
        const campaignIds = normalizeArray(filters.campaignId);
        if (campaignIds.length > 0) {
            const teamNames = campaignIds.filter((id: string) => id.startsWith('TEAM:')).map((id: string) => id.replace('TEAM:', ''));
            const realIds = campaignIds.filter((id: string) => !id.startsWith('TEAM:'));

            const campaignConditions = [];
            if (realIds.length > 0) campaignConditions.push({ campaignId: { in: realIds } });
            if (teamNames.length > 0) campaignConditions.push({ agent: { employeeTeam: { in: teamNames } } });

            if (campaignConditions.length > 1) {
                where.OR = campaignConditions;
            } else if (campaignConditions.length === 1) {
                const cond = campaignConditions[0];
                if (cond.campaignId) where.campaignId = cond.campaignId;
                if (cond.agent) where.agent = { ...where.agent, ...cond.agent };
            }
        }

        // 3. Auditor(s)
        const auditorIds = normalizeArray(filters.auditorId);
        if (auditorIds.length > 0) {
            where.auditorId = { in: auditorIds };
        }

        // 4. Agent Selection (Multi-select)
        const agentIds = normalizeArray(filters.agentId);
        if (agentIds.length > 0) {
            where.agent.id = { in: agentIds };
        }

        // 5. Agent Name (Search)
        if (filters.agentName) {
            where.agent.name = { contains: filters.agentName, mode: 'insensitive' };
        }

        // 6. Supervisor/SDM Filters
        const supervisors = normalizeArray(filters.supervisor);
        if (supervisors.length > 0) where.agent.supervisor = { in: supervisors };

        const sdms = normalizeArray(filters.sdm);
        if (sdms.length > 0) where.agent.sdm = { in: sdms };

        // 7. Ticket ID Search (External or Reference)
        if (filters.ticketId) {
            const ticketCondition = {
                OR: [
                    { sampledTicket: { ticket: { externalTicketId: { contains: filters.ticketId, mode: 'insensitive' } } } },
                    { ticketReference: { contains: filters.ticketId, mode: 'insensitive' } },
                    { agent: { name: { contains: filters.ticketId, mode: 'insensitive' } } }
                ]
            };

            // If we already have an OR (from campaigns), we must wrap both in an AND to intersect
            if (where.OR) {
                const existingOR = where.OR;
                delete where.OR;
                where.AND = [
                    { OR: existingOR },
                    ticketCondition
                ];
            } else {
                where.OR = ticketCondition.OR;
            }
        }

        // 8. Role-based Security & Governance
        if (user.role === Role.AGENT) {
            where.agentId = user.id; // Override if it's an agent viewing their own data
        } else if ([Role.QA_TL, Role.OPS_TL].includes(user.role)) {
            // Visibility limited to their own team if defined
            if (user.employeeTeam) {
                where.agent = { ...where.agent, employeeTeam: user.employeeTeam };
            }
        }

        // Clean up empty objects to help Prisma optimizer
        if (Object.keys(where.agent).length === 0) delete where.agent;

        // Execute queries
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
            // Prioritize snapshot labels for historical integrity, fallback to live relation
            const cat = curr.categoryLabel || curr.criterion?.categoryName || 'General';
            const title = curr.criterionTitle || curr.criterion?.title || 'Unknown Parameter';

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

        // Agent Scores Aggregation for Flip Card
        const agentScoresRaw = await this.prisma.audit.groupBy({
            by: ['agentId'],
            where,
            _count: { id: true },
            _avg: { score: true }
        });

        const agentScores = await Promise.all(
            agentScoresRaw.map(async (item) => {
                const agent = await this.prisma.user.findUnique({
                    where: { id: item.agentId },
                    select: { name: true }
                });
                return {
                    agentId: item.agentId,
                    agentName: agent?.name || 'Unknown Agent',
                    auditCount: item._count.id,
                    avgScore: item._avg.score ? parseFloat(item._avg.score.toFixed(2)) : 0
                };
            })
        );

        // Sort by average score descending
        agentScores.sort((a, b) => b.avgScore - a.avgScore);

        return {
            summary: {
                totalAudits,
                avgScore: parseFloat(avgScore.toFixed(2)),
                complianceRate: parseFloat(complianceRate.toFixed(2)),
                disputeRate: parseFloat(disputeRate.toFixed(2))
            },
            trend,
            failureHeatmap,
            agentScores, // Add agent scores for flip card
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
                            categoryLabel: true,
                            criterionTitle: true,
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
        const [campaigns, supervisors, sdms, qas, userTeams, auditedAgents] = await Promise.all([
            this.prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            this.prisma.user.findMany({ where: { supervisor: { not: null } }, select: { supervisor: true }, distinct: ['supervisor'] }),
            this.prisma.user.findMany({ where: { sdm: { not: null } }, select: { sdm: true }, distinct: ['sdm'] }),
            this.prisma.user.findMany({ where: { role: { in: [Role.QA, Role.QA_TL] } }, select: { id: true, name: true } }),
            this.prisma.user.findMany({ select: { employeeTeam: true }, distinct: ['employeeTeam'] }),
            this.prisma.user.findMany({
                where: { auditsReceived: { some: {} } },
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            })
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
            agents: auditedAgents,
            qas
        };
    }
}
