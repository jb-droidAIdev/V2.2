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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(filters, user) {
        const role = String(user.role || '').toUpperCase();
        const restrictedRoles = ['QA_TL', 'QATL', 'OPS_TL', 'OPSTL', 'OPS_MANAGER', 'OPSMANAGER', 'SDM', 'QA'];
        const isStaff = role !== 'AGENT';
        console.log(`[DASHBOARD] getStats Entry | User: ${user.id} | Role: ${role}`);
        let assignedCampaignIds = [];
        if (restrictedRoles.includes(role)) {
            const userAssignments = await this.prisma.campaignQA.findMany({
                where: { userId: user.id, isActive: true },
                select: { campaignId: true }
            });
            assignedCampaignIds = userAssignments.map(a => a.campaignId);
            if (assignedCampaignIds.length === 0) {
                console.log(`[DASHBOARD] Restricted user ${user.id} has no assignments - returning absolute blank state.`);
                return this.getEmptyStats();
            }
        }
        const where = {
            status: { in: [client_1.AuditStatus.SUBMITTED, client_1.AuditStatus.RELEASED, client_1.AuditStatus.DISPUTED, client_1.AuditStatus.REAPPEALED] }
        };
        where.agent = {};
        const normalizeArray = (val) => {
            if (!val)
                return [];
            const arr = Array.isArray(val) ? val : val.split(',');
            return arr.map((v) => String(v).trim()).filter(Boolean);
        };
        if (filters.startDate || filters.endDate) {
            where.submittedAt = {};
            if (filters.startDate)
                where.submittedAt.gte = new Date(filters.startDate);
            if (filters.endDate)
                where.submittedAt.lte = (0, date_fns_1.endOfDay)(new Date(filters.endDate));
        }
        const campaignIds = normalizeArray(filters.campaignId);
        if (campaignIds.length > 0) {
            const teamNames = campaignIds.filter((id) => id.startsWith('TEAM:')).map((id) => id.replace('TEAM:', ''));
            const realIds = campaignIds.filter((id) => !id.startsWith('TEAM:'));
            const campaignConditions = [];
            if (realIds.length > 0)
                campaignConditions.push({ campaignId: { in: realIds } });
            if (teamNames.length > 0)
                campaignConditions.push({ agent: { employeeTeam: { in: teamNames } } });
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
        const auditorIds = normalizeArray(filters.auditorId);
        if (auditorIds.length > 0) {
            where.auditorId = { in: auditorIds };
        }
        const agentIds = normalizeArray(filters.agentId);
        if (agentIds.length > 0) {
            where.agent.id = { in: agentIds };
        }
        if (filters.agentName) {
            where.agent.name = { contains: filters.agentName, mode: 'insensitive' };
        }
        const supervisors = normalizeArray(filters.supervisor);
        if (supervisors.length > 0)
            where.agent.supervisor = { in: supervisors };
        const sdms = normalizeArray(filters.sdm);
        if (sdms.length > 0)
            where.agent.sdm = { in: sdms };
        if (filters.ticketId) {
            const ticketCondition = {
                OR: [
                    { sampledTicket: { ticket: { externalTicketId: { contains: filters.ticketId, mode: 'insensitive' } } } },
                    { ticketReference: { contains: filters.ticketId, mode: 'insensitive' } },
                    { agent: { name: { contains: filters.ticketId, mode: 'insensitive' } } }
                ]
            };
            if (where.OR) {
                const existingOR = where.OR;
                delete where.OR;
                where.AND = [
                    { OR: existingOR },
                    ticketCondition
                ];
            }
            else {
                where.OR = ticketCondition.OR;
            }
        }
        if (role === 'AGENT') {
            where.agentId = user.id;
        }
        else if (restrictedRoles.includes(role)) {
            const assignedIds = assignedCampaignIds;
            if (where.campaignId && where.campaignId.in) {
                const requested = where.campaignId.in;
                const intersected = requested.filter((id) => assignedIds.includes(id));
                if (intersected.length === 0)
                    return this.getEmptyStats();
                where.campaignId = { in: intersected };
            }
            else {
                where.campaignId = { in: assignedIds };
            }
        }
        else if (!isStaff) {
            where.agent = { ...where.agent, employeeTeam: user.employeeTeam };
        }
        if (Object.keys(where.agent).length === 0)
            delete where.agent;
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
        const disputedCount = audits.filter(a => a.status === client_1.AuditStatus.DISPUTED || a.status === client_1.AuditStatus.REAPPEALED).length;
        const disputeRate = totalAudits > 0 ? (disputedCount / totalAudits) * 100 : 0;
        const granularity = filters.granularity || 'day';
        const now = new Date();
        const startDate = filters.startDate ? new Date(filters.startDate) :
            granularity === 'month' ? (0, date_fns_1.subDays)(now, 365) :
                granularity === 'week' ? (0, date_fns_1.subDays)(now, 90) :
                    (0, date_fns_1.subDays)(now, 13);
        const endDate = filters.endDate ? new Date(filters.endDate) : now;
        let interval;
        if (granularity === 'month') {
            interval = (0, date_fns_1.eachMonthOfInterval)({ start: startDate, end: endDate });
        }
        else if (granularity === 'week') {
            interval = (0, date_fns_1.eachWeekOfInterval)({ start: startDate, end: endDate });
        }
        else {
            interval = (0, date_fns_1.eachDayOfInterval)({ start: startDate, end: endDate });
        }
        const trend = interval.map(date => {
            let start, end, label;
            if (granularity === 'month') {
                start = (0, date_fns_1.startOfMonth)(date);
                end = (0, date_fns_1.endOfMonth)(date);
                label = (0, date_fns_1.format)(date, 'MMM yyyy');
            }
            else if (granularity === 'week') {
                start = (0, date_fns_1.startOfWeek)(date);
                end = (0, date_fns_1.endOfWeek)(date);
                label = (0, date_fns_1.format)(start, 'MMM d');
            }
            else {
                start = (0, date_fns_1.startOfDay)(date);
                end = (0, date_fns_1.endOfDay)(date);
                label = (0, date_fns_1.format)(date, 'MMM dd');
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
            const cat = (curr.categoryLabel || curr.criterion?.categoryName || 'General').trim();
            const title = curr.criterionTitle || curr.criterion?.title || 'Unknown Parameter';
            if (!acc[cat]) {
                acc[cat] = { count: 0, parameters: {} };
            }
            acc[cat].count += 1;
            acc[cat].parameters[title] = (acc[cat].parameters[title] || 0) + 1;
            return acc;
        }, {});
        const failureHeatmap = Object.entries(categoryAggregation)
            .map(([name, data]) => ({
            name,
            value: data.count,
            parameters: Object.entries(data.parameters)
                .map(([pName, pValue]) => ({ name: pName, value: pValue }))
                .sort((a, b) => b.value - a.value)
        }))
            .sort((a, b) => b.value - a.value);
        const agentScoresRaw = await this.prisma.audit.groupBy({
            by: ['agentId'],
            where,
            _count: { id: true },
            _avg: { score: true }
        });
        const agentScores = await Promise.all(agentScoresRaw.map(async (item) => {
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
        }));
        agentScores.sort((a, b) => b.avgScore - a.avgScore);
        let policyProgress = null;
        let activeProgressions = [];
        const filteredAgentIds = normalizeArray(filters.agentId);
        let targetAgentId = null;
        if (filteredAgentIds.length === 1) {
            targetAgentId = filteredAgentIds[0];
        }
        else if (agentScores.length === 1) {
            targetAgentId = agentScores[0].agentId;
        }
        else if (user.role === client_1.Role.AGENT) {
            targetAgentId = user.id;
        }
        if (user.role !== client_1.Role.AGENT) {
            const bufferStartDate = (0, date_fns_1.subDays)(startDate, 30);
            const allFailuresInScope = await this.prisma.auditScore.findMany({
                where: {
                    isFailed: true,
                    audit: {
                        ...where,
                        submittedAt: { gte: bufferStartDate, lte: endDate }
                    }
                },
                select: {
                    categoryLabel: true,
                    criterion: { select: { categoryName: true } },
                    audit: {
                        select: {
                            agentId: true,
                            submittedAt: true,
                            agent: { select: { name: true, employeeTeam: true } },
                            campaign: { select: { name: true } }
                        }
                    }
                }
            });
            const groupedByAgentCat = {};
            allFailuresInScope.forEach(f => {
                const agentId = f.audit.agentId;
                const cat = (f.categoryLabel || f.criterion?.categoryName || 'General').trim();
                if (!groupedByAgentCat[agentId])
                    groupedByAgentCat[agentId] = {};
                if (!groupedByAgentCat[agentId][cat])
                    groupedByAgentCat[agentId][cat] = [];
                groupedByAgentCat[agentId][cat].push(f);
            });
            for (const [agentId, cats] of Object.entries(groupedByAgentCat)) {
                for (const [category, instances] of Object.entries(cats)) {
                    const sortedInstances = [...instances].sort((a, b) => new Date(b.audit.submittedAt).getTime() - new Date(a.audit.submittedAt).getTime());
                    const latest = sortedInstances[0];
                    const lastInfractionDate = new Date(latest.audit.submittedAt);
                    if (lastInfractionDate < startDate)
                        continue;
                    const windowStart = (0, date_fns_1.subDays)(lastInfractionDate, 30);
                    const count = instances.filter(i => {
                        const d = new Date(i.audit.submittedAt);
                        return d >= windowStart && d <= lastInfractionDate;
                    }).length;
                    if (count >= 3) {
                        let sanction = 'Written Warning';
                        if (count >= 15)
                            sanction = 'Termination';
                        else if (count >= 12)
                            sanction = 'Suspension (5 Days)';
                        else if (count >= 9)
                            sanction = 'Suspension (3 Days)';
                        else if (count >= 6)
                            sanction = 'Final Written Warning';
                        activeProgressions.push({
                            agentId,
                            agentName: latest.audit.agent?.name || 'Unknown',
                            teamName: latest.audit.agent?.employeeTeam || 'Direct Report',
                            campaign: latest.audit.campaign?.name || latest.audit.agent?.employeeTeam || 'N/A',
                            category,
                            count,
                            sanction,
                            lastInfraction: lastInfractionDate
                        });
                    }
                }
            }
            activeProgressions.sort((a, b) => b.count - a.count);
        }
        if (targetAgentId) {
            const singleAgentId = targetAgentId;
            const agentFailures = await this.prisma.auditScore.findMany({
                where: {
                    isFailed: true,
                    audit: {
                        agentId: singleAgentId,
                        status: { in: [client_1.AuditStatus.SUBMITTED, client_1.AuditStatus.RELEASED, client_1.AuditStatus.DISPUTED, client_1.AuditStatus.REAPPEALED] }
                    }
                },
                select: {
                    categoryLabel: true,
                    criterion: { select: { categoryName: true } },
                    audit: { select: { submittedAt: true } }
                }
            });
            const failuresByCat = {};
            agentFailures.forEach(f => {
                const cat = (f.categoryLabel || f.criterion?.categoryName || 'General').trim();
                if (!failuresByCat[cat])
                    failuresByCat[cat] = [];
                failuresByCat[cat].push(f);
            });
            policyProgress = Object.entries(failuresByCat).map(([category, instances]) => {
                const sortedInstances = [...instances].sort((a, b) => new Date(b.audit.submittedAt).getTime() - new Date(a.audit.submittedAt).getTime());
                const lastInfractionDate = new Date(sortedInstances[0].audit.submittedAt);
                const windowStart = (0, date_fns_1.subDays)(lastInfractionDate, 30);
                const count = instances.filter(i => {
                    const d = new Date(i.audit.submittedAt);
                    return d >= windowStart && d <= lastInfractionDate;
                }).length;
                let sanction = null;
                if (count >= 15)
                    sanction = 'For Termination';
                else if (count >= 12)
                    sanction = 'For Suspension (5 Days)';
                else if (count >= 9)
                    sanction = 'For Suspension (3 Days)';
                else if (count >= 6)
                    sanction = 'For Final Written Warning';
                else if (count >= 3)
                    sanction = 'For Written Warning';
                return {
                    category,
                    count,
                    lastInfraction: lastInfractionDate,
                    sanction
                };
            }).sort((a, b) => b.count - a.count);
        }
        return {
            summary: {
                totalAudits,
                avgScore: parseFloat(avgScore.toFixed(2)),
                complianceRate: parseFloat(complianceRate.toFixed(2)),
                disputeRate: parseFloat(disputeRate.toFixed(2))
            },
            trend,
            failureHeatmap,
            agentScores,
            policyProgress,
            activeProgressions,
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
    async getFilterOptions(user) {
        try {
            const role = String(user.role || '').toUpperCase();
            const isStaff = role !== 'AGENT';
            const isManagerRestricted = ['QA_TL', 'QATL', 'OPS_TL', 'OPSTL', 'OPS_MANAGER', 'OPSMANAGER', 'SDM', 'QA'].includes(role);
            console.log(`[DASHBOARD] getFilterOptions | User ID: ${user.id} | role=${role} | restricted=${isManagerRestricted}`);
            const visibilityFilter = {};
            let assignedIds = [];
            if (!isStaff) {
                visibilityFilter.id = user.id;
            }
            else if (isManagerRestricted) {
                const assignments = await this.prisma.campaignQA.findMany({
                    where: { userId: user.id, isActive: true },
                    select: { campaignId: true }
                });
                assignedIds = assignments.map(a => a.campaignId);
                if (assignedIds.length === 0) {
                    return { campaigns: [], supervisors: [], sdms: [], agents: [], qas: [] };
                }
                visibilityFilter.auditsReceived = {
                    some: { campaignId: { in: assignedIds } }
                };
            }
            let campaignFilter = { type: 'USER', audits: { some: {} } };
            if (isManagerRestricted) {
                campaignFilter.qaAssignments = { some: { userId: user.id, isActive: true } };
            }
            else if (!isStaff) {
                campaignFilter.OR = [
                    { qaAssignments: { some: { userId: user.id } } },
                    { name: user.employeeTeam }
                ];
            }
            const campaigns = await this.prisma.campaign.findMany({
                where: campaignFilter,
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });
            const supervisorsRaw = await this.prisma.user.findMany({
                where: {
                    supervisor: { not: null },
                    ...((!isStaff || isManagerRestricted) ? visibilityFilter : {})
                },
                select: { supervisor: true },
                distinct: ['supervisor']
            });
            const sdmsRaw = await this.prisma.user.findMany({
                where: {
                    sdm: { not: null },
                    ...((!isStaff || isManagerRestricted) ? visibilityFilter : {})
                },
                select: { sdm: true },
                distinct: ['sdm']
            });
            const userTeams = await this.prisma.user.findMany({
                where: {
                    auditsReceived: isManagerRestricted
                        ? visibilityFilter.auditsReceived
                        : { some: {} },
                    ...(!isStaff ? { employeeTeam: user.employeeTeam } : {})
                },
                select: { employeeTeam: true },
                distinct: ['employeeTeam']
            });
            const auditedAgents = await this.prisma.user.findMany({
                where: {
                    role: 'AGENT',
                    auditsReceived: isManagerRestricted
                        ? visibilityFilter.auditsReceived
                        : { some: {} },
                    ...(!isStaff ? { id: user.id } : {})
                },
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });
            const qas = await this.prisma.user.findMany({
                where: { role: { in: [client_1.Role.QA, client_1.Role.QA_TL] } },
                select: { id: true, name: true }
            });
            const campaignNames = new Set(campaigns.map(c => c.name.toLowerCase().trim()));
            const implicitCampaigns = userTeams
                .map(t => t.employeeTeam?.trim())
                .filter(t => t && t !== 'Unassigned' && !campaignNames.has(t.toLowerCase()))
                .map(t => ({ id: `TEAM:${t}`, name: t }));
            return {
                campaigns: [...campaigns, ...implicitCampaigns].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
                supervisors: supervisorsRaw.map(s => s.supervisor).filter(Boolean).sort(),
                sdms: sdmsRaw.map(s => s.sdm).filter(Boolean).sort(),
                agents: auditedAgents,
                qas
            };
        }
        catch (error) {
            console.error('[DASHBOARD] ERROR:', error);
            throw error;
        }
    }
    getEmptyStats() {
        return {
            summary: {
                totalAudits: 0,
                avgScore: 0,
                complianceRate: 0,
                disputeRate: 0
            },
            trend: [],
            failureHeatmap: [],
            agentScores: [],
            policyProgress: [],
            activeProgressions: [],
            failedAudits: []
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map