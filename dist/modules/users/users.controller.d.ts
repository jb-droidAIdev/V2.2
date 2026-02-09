import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getRoles(): Promise<({
        permissions: ({
            permission: {
                id: string;
                description: string;
                code: string;
                module: string;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        isSystem: boolean;
    })[]>;
    getPermissions(): Promise<{
        id: string;
        description: string;
        code: string;
        module: string;
    }[]>;
    updateRolePermissions(id: string, body: {
        permissions: string[];
    }): Promise<({
        permissions: ({
            permission: {
                id: string;
                description: string;
                code: string;
                module: string;
            };
        } & {
            roleId: string;
            permissionId: string;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        isSystem: boolean;
    })[]>;
    findAll(req: any): Promise<{
        id: string;
        name: string;
        role: import(".prisma/client").$Enums.Role;
        email: string;
        createdAt: Date;
        billable: boolean;
        eid: string;
        employeeTeam: string;
        manager: string;
        projectCode: string;
        sdm: string;
        supervisor: string;
        systemId: string;
        isActive: boolean;
    }[]>;
    create(data: any): Promise<{
        id: string;
        name: string;
        roleId: string | null;
        role: import(".prisma/client").$Enums.Role;
        email: string;
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
    }>;
    getUniqueTeams(): Promise<string[]>;
    findByTeam(teamName: string, req: any): Promise<{
        id: string;
        name: string;
        email: string;
        eid: string;
        employeeTeam: string;
        manager: string;
        sdm: string;
        supervisor: string;
    }[]>;
    bulkCreate(users: any[]): Promise<{
        count: number;
    }>;
    renameTeam(body: {
        oldName: string;
        newName: string;
    }): Promise<import(".prisma/client").Prisma.BatchPayload>;
    update(id: string, data: any): Promise<{
        id: string;
        name: string;
        roleId: string | null;
        role: import(".prisma/client").$Enums.Role;
        email: string;
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
    }>;
    getCampaigns(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        samplingRate: number;
        stratification: import("@prisma/client/runtime/library").JsonValue | null;
        type: import(".prisma/client").$Enums.CampaignType;
    }[]>;
    updateCampaigns(id: string, body: {
        campaignIds: string[];
    }): Promise<void>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        roleId: string | null;
        role: import(".prisma/client").$Enums.Role;
        email: string;
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
    }>;
}
