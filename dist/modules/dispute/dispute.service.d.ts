import { PrismaService } from '../../prisma.service';
import { DisputeVerdict } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
export declare class DisputeService {
    private prisma;
    private auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    createDispute(auditId: string, userId: string, data: {
        items: {
            criterionId: string;
            reason: string;
        }[];
    }): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.DisputeStatus;
        createdAt: Date;
        updatedAt: Date;
        auditId: string;
        raisedById: string;
    }>;
    qaVerdict(disputeId: string, auditorId: string, itemId: string, data: {
        verdict: DisputeVerdict;
        comment: string;
    }): Promise<{
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
    reappeal(disputeId: string, userId: string, data: {
        reappealReason: string;
    }): Promise<{
        status: string;
    }>;
    finalVerdict(disputeId: string, adminId: string, itemId: string, data: {
        verdict: DisputeVerdict;
        comment: string;
    }): Promise<{
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
    private applyCorrection;
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
