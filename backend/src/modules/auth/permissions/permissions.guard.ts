import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { Permission, PermissionsService } from './permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionsService: PermissionsService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const { user } = context.switchToHttp().getRequest();

        // Universal Access: Admins bypass all checks (if role is still on user object)
        // Or check if user has '*' permission? For now, keep simple role check if available, or fetch permissions.
        // Strategy: Fetch permissions always.

        if (!user) return false;

        // Optimization: If user already has permissions attached (e.g. from JWT strategy), use them.
        // Otherwise, fetch them.
        let userPermissions = user.permissions;

        if (!userPermissions) {
            userPermissions = await this.permissionsService.getUserPermissions(user.userId || user.id);
        }

        // Admin Override (Implicit in permissions usually, but as failsafe)
        if (user.role === 'ADMIN' || userPermissions.includes('*')) return true;

        if (!requiredPermissions) {
            return true;
        }

        return requiredPermissions.every((permission) => userPermissions.includes(permission));
    }
}
