import { FormsService } from './forms.service';
export declare class FormsController {
    private readonly formsService;
    constructor(formsService: FormsService);
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
    create(body: any): Promise<{
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
    findAvailable(campaignId?: string, teamName?: string): Promise<({
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
    getVersions(id: string): Promise<({
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
    createVersion(id: string, body: any, req: any): Promise<{
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
    publishVersion(vid: string): Promise<{
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
    update(id: string, body: any): Promise<{
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
    duplicate(id: string, body: any, req: any): Promise<{
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
}
