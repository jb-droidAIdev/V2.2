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

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const { user } = context.switchToHttp().getRequest();

        // Universal Access: Admins bypass all checks
        if (user?.role === Role.ADMIN) return true;

        if (!requiredPermissions) {
            return true;
        }

        const userRole = user?.role;
        if (!userRole) return false;

        return requiredPermissions.every((permission) =>
            this.permissionsService.hasPermission(userRole, permission)
        );
    }
}
