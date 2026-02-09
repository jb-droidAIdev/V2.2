import { DisputeService } from './dispute.service';
export declare class DisputeController {
    private readonly disputeService;
    constructor(disputeService: DisputeService);
    create(body: any, req: any): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        auditId: string;
        raisedById: string;
    }>;
    qaVerdict(id: string, body: any, req: any): Promise<{
        id: string;
        createdAt: Date;
        criterionId: string;
        finalComment: string | null;
        finalVerdict: import(".prisma/client").$Enums.DisputeVerdict | null;
        finalizedAt: Date | null;
        finalizedById: string | null;
        qaComment: string | null;
        qaReviewedAt: Date | null;
        qaReviewedById: string | null;
        qaVerdict: import(".prisma/client").$Enums.DisputeVerdict | null;
        reappealReason: string | null;
        reappealedAt: Date | null;
        reason: string;
        disputeId: string;
    }>;
    reappeal(id: string, body: any, req: any): Promise<{
        status: string;
    }>;
    finalVerdict(id: string, body: any, req: any): Promise<{
        id: string;
        createdAt: Date;
        criterionId: string;
        finalComment: string | null;
        finalVerdict: import(".prisma/client").$Enums.DisputeVerdict | null;
        finalizedAt: Date | null;
        finalizedById: string | null;
        qaComment: string | null;
        qaReviewedAt: Date | null;
        qaReviewedById: string | null;
        qaVerdict: import(".prisma/client").$Enums.DisputeVerdict | null;
        reappealReason: string | null;
        reappealedAt: Date | null;
        reason: string;
        disputeId: string;
    }>;
    findAll(): Promise<({
        audit: {
            agent: {
                name: string;
                eid: string;
            };
            campaign: {
                name: string;
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
        };
        raisedBy: {
            name: string;
        };
        items: ({
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
        } & {
            id: string;
            createdAt: Date;
            criterionId: string;
            finalComment: string | null;
            finalVerdict: import(".prisma/client").$Enums.DisputeVerdict | null;
            finalizedAt: Date | null;
            finalizedById: string | null;
            qaComment: string | null;
            qaReviewedAt: Date | null;
            qaReviewedById: string | null;
            qaVerdict: import(".prisma/client").$Enums.DisputeVerdict | null;
            reappealReason: string | null;
            reappealedAt: Date | null;
            reason: string;
            disputeId: string;
        })[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        auditId: string;
        raisedById: string;
    })[]>;
    findByAudit(auditId: string): Promise<{
        raisedBy: {
            name: string;
        };
        items: ({
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
        } & {
            id: string;
            createdAt: Date;
            criterionId: string;
            finalComment: string | null;
            finalVerdict: import(".prisma/client").$Enums.DisputeVerdict | null;
            finalizedAt: Date | null;
            finalizedById: string | null;
            qaComment: string | null;
            qaReviewedAt: Date | null;
            qaReviewedById: string | null;
            qaVerdict: import(".prisma/client").$Enums.DisputeVerdict | null;
            reappealReason: string | null;
            reappealedAt: Date | null;
            reason: string;
            disputeId: string;
        })[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        auditId: string;
        raisedById: string;
    }>;
}
