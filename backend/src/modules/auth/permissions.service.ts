import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

export enum Permission {
    // Audit Permissions
    AUDIT_CREATE = 'AUDIT_CREATE',
    AUDIT_VIEW_SELF = 'AUDIT_VIEW_SELF',
    AUDIT_VIEW_TEAM = 'AUDIT_VIEW_TEAM',
    AUDIT_VIEW_ALL = 'AUDIT_VIEW_ALL',

    // Dispute Permissions
    DISPUTE_CREATE = 'DISPUTE_CREATE',
    DISPUTE_RESOLVE = 'DISPUTE_RESOLVE',
    DISPUTE_REAPPEAL = 'DISPUTE_REAPPEAL',

    // Form Permissions
    FORM_CREATE = 'FORM_CREATE',
    FORM_EDIT = 'FORM_EDIT',

    // Calibration Permissions
    CALIBRATION_CREATE = 'CALIBRATION_CREATE',
    CALIBRATION_VIEW = 'CALIBRATION_VIEW',
    CALIBRATION_MANAGE = 'CALIBRATION_MANAGE',
    CALIBRATION_VALIDATE_ANCHOR = 'CALIBRATION_VALIDATE_ANCHOR',
    CALIBRATION_SCORE = 'CALIBRATION_SCORE',

    // User/System Permissions
    USER_MANAGE = 'USER_MANAGE',
    CAMPAIGN_MANAGE = 'CAMPAIGN_MANAGE',
    DASHBOARD_VIEW = 'DASHBOARD_VIEW',
}

@Injectable()
export class PermissionsService {
    private readonly rolePermissions: Record<Role, Permission[]> = {
        [Role.ADMIN]: Object.values(Permission),
        [Role.SDM]: [
            Permission.AUDIT_VIEW_TEAM,
            Permission.AUDIT_VIEW_ALL,
            Permission.DISPUTE_CREATE,
            Permission.DISPUTE_REAPPEAL,
            Permission.DASHBOARD_VIEW,
            Permission.CALIBRATION_VIEW,
            Permission.CALIBRATION_VALIDATE_ANCHOR,
        ],
        [Role.OPS_MANAGER]: [
            Permission.AUDIT_VIEW_TEAM,
            Permission.DISPUTE_CREATE,
            Permission.DISPUTE_REAPPEAL,
            Permission.DASHBOARD_VIEW,
            Permission.CALIBRATION_VIEW,
            Permission.CALIBRATION_VALIDATE_ANCHOR, // Allowing OPS Manager to validate if acting as AM
        ],
        [Role.OPS_TL]: [
            Permission.AUDIT_VIEW_TEAM,
            Permission.DISPUTE_CREATE,
            Permission.DISPUTE_REAPPEAL,
            Permission.DASHBOARD_VIEW,
            Permission.CALIBRATION_VIEW,
        ],
        [Role.QA_MANAGER]: [
            Permission.AUDIT_VIEW_TEAM,
            Permission.AUDIT_VIEW_ALL,
            Permission.AUDIT_CREATE,
            Permission.DISPUTE_RESOLVE,
            Permission.FORM_CREATE,
            Permission.FORM_EDIT,
            Permission.DASHBOARD_VIEW,
            Permission.CAMPAIGN_MANAGE,
            Permission.USER_MANAGE,
            Permission.CALIBRATION_CREATE,
            Permission.CALIBRATION_VIEW,
            Permission.CALIBRATION_MANAGE,
            Permission.CALIBRATION_VALIDATE_ANCHOR,
        ],
        [Role.QA_TL]: [
            Permission.AUDIT_VIEW_TEAM,
            Permission.AUDIT_CREATE,
            Permission.DISPUTE_RESOLVE,
            Permission.FORM_CREATE,
            Permission.FORM_EDIT,
            Permission.DASHBOARD_VIEW,
            Permission.USER_MANAGE,
            Permission.CALIBRATION_CREATE,
            Permission.CALIBRATION_VIEW,
            Permission.CALIBRATION_MANAGE,
            Permission.CALIBRATION_VALIDATE_ANCHOR,
            Permission.CALIBRATION_SCORE,
        ],
        [Role.QA]: [
            Permission.AUDIT_CREATE,
            Permission.AUDIT_VIEW_SELF,
            Permission.DISPUTE_RESOLVE,
            Permission.CALIBRATION_CREATE,
            Permission.CALIBRATION_VIEW,
            Permission.CALIBRATION_MANAGE,
            Permission.CALIBRATION_VALIDATE_ANCHOR,
            Permission.CALIBRATION_SCORE,
        ],
        [Role.AGENT]: [
            Permission.AUDIT_VIEW_SELF,
            Permission.DASHBOARD_VIEW,
        ],
    };

    getPermissionsForRole(role: Role): Permission[] {
        return this.rolePermissions[role] || [];
    }

    hasPermission(role: Role, permission: Permission): boolean {
        return this.getPermissionsForRole(role).includes(permission);
    }
}
