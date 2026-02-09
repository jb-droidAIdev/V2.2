import { PrismaService } from '../../prisma.service';
import { User } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(identifier: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    findAll(user?: any): Promise<{
        name: string;
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
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
    findByTeam(teamName: string, requestingUserId?: string): Promise<{
        name: string;
        id: string;
        email: string;
        eid: string;
        employeeTeam: string;
        manager: string;
        sdm: string;
        supervisor: string;
    }[]>;
    create(data: any): Promise<{
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
    }>;
    bulkCreate(users: any[]): Promise<{
        count: number;
    }>;
    getUniqueTeams(): Promise<string[]>;
    updateLoginMetadata(id: string, data: {
        failedLoginAttempts?: number;
        lockoutUntil?: Date | null;
        lastLoginAt?: Date;
    }): Promise<{
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
    }>;
    updatePassword(id: string, password: string): Promise<{
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
    }>;
    remove(id: string): Promise<{
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
    }>;
    bulkUpdateTeam(oldTeamName: string, newTeamName: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    updateUser(id: string, data: any): Promise<{
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
    }>;
    findAllRoles(): Promise<({
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
        name: string;
        id: string;
        description: string | null;
        isSystem: boolean;
    })[]>;
    updateRolePermissions(roleId: string, permissionCodes: string[]): Promise<({
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
        name: string;
        id: string;
        description: string | null;
        isSystem: boolean;
    })[]>;
    getAllPermissions(): Promise<{
        id: string;
        description: string;
        code: string;
        module: string;
    }[]>;
    getAssignedCampaigns(userId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        samplingRate: number;
        stratification: import("@prisma/client/runtime/library").JsonValue | null;
        type: import(".prisma/client").$Enums.CampaignType;
    }[]>;
    assignCampaigns(userId: string, campaignIds: string[]): Promise<void>;
}
