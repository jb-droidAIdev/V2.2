import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getActive(req: any): Promise<{
        agent: {
            id: string;
            name: string;
            eid: string;
            employeeTeam: string;
            manager: string;
            sdm: string;
            supervisor: string;
        };
        formVersion: {
            criteria: {
                id: string;
                formVersionId: string;
                isActive: boolean;
                categoryId: string;
                categoryName: string;
                title: string;
                description: string | null;
                weight: number;
                isCritical: boolean;
                orderIndex: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            isActive: boolean;
            formId: string;
            versionNumber: number;
            isDraft: boolean;
            categories: import("@prisma/client/runtime/library").JsonValue;
            publishedAt: Date | null;
            creatorId: string | null;
            changeLog: string | null;
        };
        fieldValues: {
            id: string;
            auditId: string;
            fieldName: string;
            value: string;
        }[];
        scores: {
            id: string;
            score: number;
            auditId: string;
            criterionId: string;
            comment: string | null;
            isFailed: boolean;
            categoryLabel: string | null;
            criterionTitle: string | null;
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
    }>;
    findAll(req: any): Promise<any[]>;
    getFailures(req: any, query: any): Promise<({
        agent: {
            name: string;
            employeeTeam: string;
        };
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
        scores: {
            comment: string;
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
    })[]>;
    start(sampledTicketId: string, formVersionId: string, campaignId: string, req: any): Promise<{
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
    }>;
    createManual(body: any, req: any): Promise<{
        agent: {
            id: string;
            name: string;
            eid: string;
            employeeTeam: string;
            manager: string;
            sdm: string;
            supervisor: string;
        };
        formVersion: {
            criteria: {
                id: string;
                formVersionId: string;
                isActive: boolean;
                categoryId: string;
                categoryName: string;
                title: string;
                description: string | null;
                weight: number;
                isCritical: boolean;
                orderIndex: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            isActive: boolean;
            formId: string;
            versionNumber: number;
            isDraft: boolean;
            categories: import("@prisma/client/runtime/library").JsonValue;
            publishedAt: Date | null;
            creatorId: string | null;
            changeLog: string | null;
        };
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
    }>;
    findOne(id: string, req: any): Promise<{
        scores: {
            reachedMilestone: number;
            criterion: {
                id: string;
                formVersionId: string;
                isActive: boolean;
                categoryId: string;
                categoryName: string;
                title: string;
                description: string | null;
                weight: number;
                isCritical: boolean;
                orderIndex: number;
            };
            id: string;
            score: number;
            auditId: string;
            criterionId: string;
            comment: string | null;
            isFailed: boolean;
            categoryLabel: string | null;
            criterionTitle: string | null;
        }[];
        agent: {
            name: string;
            eid: string;
            employeeTeam: string;
        };
        auditor: {
            name: string;
            eid: string;
        };
        campaign: {
            name: string;
        };
        formVersion: {
            criteria: {
                id: string;
                formVersionId: string;
                isActive: boolean;
                categoryId: string;
                categoryName: string;
                title: string;
                description: string | null;
                weight: number;
                isCritical: boolean;
                orderIndex: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            isActive: boolean;
            formId: string;
            versionNumber: number;
            isDraft: boolean;
            categories: import("@prisma/client/runtime/library").JsonValue;
            publishedAt: Date | null;
            creatorId: string | null;
            changeLog: string | null;
        };
        sampledTicket: {
            ticket: {
                id: string;
                campaignId: string;
                agentId: string;
                batchId: string;
                externalTicketId: string;
                interactionDate: Date;
                channel: string | null;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
            };
        } & {
            id: string;
            status: string;
            ticketId: string;
            runId: string;
            assignedQaId: string | null;
        };
        fieldValues: {
            id: string;
            auditId: string;
            fieldName: string;
            value: string;
        }[];
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
    }>;
    autosave(id: string, body: any, req: any): Promise<{
        status: string;
        score: number;
    }>;
    submit(id: string, req: any): Promise<{
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
    }>;
    remove(id: string): Promise<{
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
    }>;
}
