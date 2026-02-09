import { PrismaService } from '../../prisma.service';
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getStats(filters: {
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
    }, user: any): Promise<{
        summary: {
            totalAudits: number;
            avgScore: number;
            complianceRate: number;
            disputeRate: number;
        };
        trend: any[];
        failureHeatmap: any[];
        agentScores: any[];
        policyProgress: any[];
        activeProgressions: any[];
        failedAudits: any[];
    } | {
        summary: {
            totalAudits: number;
            avgScore: number;
            complianceRate: number;
            disputeRate: number;
        };
        trend: any;
        failureHeatmap: {
            name: string;
            value: number;
            parameters: {
                name: string;
                value: number;
            }[];
        }[];
        agentScores: {
            agentId: string;
            agentName: string;
            auditCount: number;
            avgScore: number;
        }[];
        policyProgress: any;
        activeProgressions: any[];
        failedAudits: ({
            campaign: {
                name: string;
            };
            sampledTicket: {
                ticket: {
                    externalTicketId: string;
                };
            } & {
                id: string;
                status: string;
                ticketId: string;
                runId: string;
                assignedQaId: string | null;
            };
            agent: {
                name: string;
                employeeTeam: string;
            };
            scores: {
                comment: string;
                categoryLabel: string;
                criterionTitle: string;
                criterion: {
                    categoryName: string;
                    title: string;
                };
            }[];
        } & {
            id: string;
            campaignId: string;
            sampledTicketId: string | null;
            formVersionId: string;
            auditorId: string;
            agentId: string;
            status: import(".prisma/client").$Enums.AuditStatus;
            score: number | null;
            isAutoFailed: boolean;
            startedAt: Date;
            submittedAt: Date | null;
            releasedAt: Date | null;
            agentAckDeadline: Date | null;
            lastActionAt: Date;
            ticketReference: string | null;
        })[];
    }>;
    getFilterOptions(user: any): Promise<{
        campaigns: {
            name: string;
            id: string;
        }[];
        supervisors: string[];
        sdms: string[];
        agents: {
            name: string;
            id: string;
        }[];
        qas: {
            name: string;
            id: string;
        }[];
    }>;
    private getEmptyStats;
}
