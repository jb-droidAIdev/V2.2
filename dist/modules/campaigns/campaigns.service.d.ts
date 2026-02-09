import { PrismaService } from '../../prisma.service';
export declare class CampaignsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(user?: any): Promise<({
        _count: {
            qaAssignments: number;
            forms: number;
        };
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        samplingRate: number;
        stratification: import("@prisma/client/runtime/library").JsonValue | null;
        type: import(".prisma/client").$Enums.CampaignType;
    })[]>;
    findAssigned(userId: string): Promise<any>;
    findOneDetail(id: string): Promise<{
        qaAssignments: ({
            user: {
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
            isActive: boolean;
            campaignId: string;
            userId: string;
            assignedAt: Date;
        })[];
        _count: {
            forms: number;
        };
        forms: ({
            _count: {
                versions: number;
            };
        } & {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            campaignId: string | null;
            description: string | null;
            teamName: string | null;
            isConfigured: boolean;
            isArchived: boolean;
        })[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        samplingRate: number;
        stratification: import("@prisma/client/runtime/library").JsonValue | null;
        type: import(".prisma/client").$Enums.CampaignType;
    }>;
    create(data: {
        name: string;
        type?: any;
        samplingRate?: number;
        stratification?: any;
        assignedUserIds?: string[];
    }): Promise<{
        qaAssignments: {
            id: string;
            isActive: boolean;
            campaignId: string;
            userId: string;
            assignedAt: Date;
        }[];
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        samplingRate: number;
        stratification: import("@prisma/client/runtime/library").JsonValue | null;
        type: import(".prisma/client").$Enums.CampaignType;
    }>;
    update(id: string, data: {
        name?: string;
        samplingRate?: number;
        stratification?: any;
        assignedUserIds?: string[];
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        samplingRate: number;
        stratification: import("@prisma/client/runtime/library").JsonValue | null;
        type: import(".prisma/client").$Enums.CampaignType;
    }>;
    remove(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        samplingRate: number;
        stratification: import("@prisma/client/runtime/library").JsonValue | null;
        type: import(".prisma/client").$Enums.CampaignType;
    }>;
    assignQa(campaignId: string, userId: string): Promise<{
        id: string;
        isActive: boolean;
        campaignId: string;
        userId: string;
        assignedAt: Date;
    }>;
}
