import { ReleaseService } from './release.service';
export declare class ReleaseController {
    private readonly releaseService;
    constructor(releaseService: ReleaseService);
    getPending(): Promise<({
        campaign: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            samplingRate: number;
            stratification: import("@prisma/client/runtime/library").JsonValue | null;
            type: import(".prisma/client").$Enums.CampaignType;
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
        auditor: {
            name: string;
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            createdAt: Date;
            updatedAt: Date;
            password: string;
            billable: boolean;
            eid: string | null;
            employeeTeam: string | null;
            manager: string | null;
            projectCode: string | null;
            sdm: string | null;
            supervisor: string | null;
            systemId: string | null;
            failedLoginAttempts: number;
            isActive: boolean;
            lastLoginAt: Date | null;
            lockoutUntil: Date | null;
            mustChangePassword: boolean;
            roleId: string | null;
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
    })[]>;
    release(auditIds: string[], req: any): Promise<{
        releasedCount: number;
    }>;
}
