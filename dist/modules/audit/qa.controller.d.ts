import { AuditService } from './audit.service';
export declare class QaController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getQueue(req: any): Promise<({
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
    })[]>;
}
