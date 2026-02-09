import { PrismaService } from '../../prisma.service';
export declare class FormsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        hasAudits: boolean;
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
        _count: {
            versions: number;
        };
        versions: ({
            _count: {
                audits: number;
                criteria: number;
            };
            creator: {
                name: string;
                email: string;
            };
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
        })[];
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string | null;
        description: string | null;
        teamName: string | null;
        isConfigured: boolean;
        isArchived: boolean;
    }[]>;
    getDrafts(): Promise<({
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
    })[]>;
    findOne(id: string): Promise<{
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
        versions: ({
            criteria: {
                id: string;
                isActive: boolean;
                description: string | null;
                formVersionId: string;
                orderIndex: number;
                categoryId: string;
                categoryName: string;
                title: string;
                weight: number;
                isCritical: boolean;
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
        })[];
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
    }>;
    create(data: {
        campaignId?: string;
        teamName: string;
        name: string;
        description?: string;
    }): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string | null;
        description: string | null;
        teamName: string | null;
        isConfigured: boolean;
        isArchived: boolean;
    }>;
    markConfigured(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string | null;
        description: string | null;
        teamName: string | null;
        isConfigured: boolean;
        isArchived: boolean;
    }>;
    update(id: string, data: any): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string | null;
        description: string | null;
        teamName: string | null;
        isConfigured: boolean;
        isArchived: boolean;
    }>;
    getVersions(formId: string): Promise<({
        _count: {
            audits: number;
            criteria: number;
        };
        creator: {
            name: string;
            email: string;
        };
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
    })[]>;
    findActiveByCampaign(campaignId: string): Promise<{
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
        versions: ({
            criteria: {
                id: string;
                isActive: boolean;
                description: string | null;
                formVersionId: string;
                orderIndex: number;
                categoryId: string;
                categoryName: string;
                title: string;
                weight: number;
                isCritical: boolean;
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
        })[];
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
    }>;
    createVersion(formId: string, data: any, creatorId?: string): Promise<{
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
    }>;
    publishVersion(versionId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string | null;
        description: string | null;
        teamName: string | null;
        isConfigured: boolean;
        isArchived: boolean;
    }>;
    archive(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string | null;
        description: string | null;
        teamName: string | null;
        isConfigured: boolean;
        isArchived: boolean;
    }>;
    remove(id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string | null;
        description: string | null;
        teamName: string | null;
        isConfigured: boolean;
        isArchived: boolean;
    }>;
    findByCampaignOrTeam(campaignId?: string, teamName?: string): Promise<({
        versions: ({
            _count: {
                criteria: number;
            };
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
        })[];
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
    })[]>;
    duplicate(sourceFormId: string, data: {
        name: string;
        campaignId?: string;
        teamName?: string;
    }, creatorId?: string): Promise<{
        form: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            campaignId: string | null;
            description: string | null;
            teamName: string | null;
            isConfigured: boolean;
            isArchived: boolean;
        };
        version: {
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
    }>;
    private performDuplicate;
}
