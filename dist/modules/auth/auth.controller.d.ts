import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private authService;
    private usersService;
    constructor(authService: AuthService, usersService: UsersService);
    login(body: any): Promise<{
        access_token: string;
        user: any;
    }>;
    getProfile(req: any): any;
    updatePassword(req: any, body: any): Promise<{
        id: string;
        email: string;
        name: string;
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
}
