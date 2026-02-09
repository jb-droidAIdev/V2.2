import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class PermissionsService {
    constructor(private prisma: PrismaService) { }

    // Method to get permissions for a user from the database
    async getUserPermissions(userId: string): Promise<string[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                userRole: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                },
                customPermissions: {
                    include: { permission: true }
                }
            }
        });

        if (!user) return [];

        const rolePermissions = user.userRole?.permissions.map(p => p.permission.code) || [];
        const customPermissions = user.customPermissions.map(p => p.permission.code) || [];

        // Combine and distinct
        return Array.from(new Set([...rolePermissions, ...customPermissions]));
    }

    // Checking if a user has a permission (requires fetching user first or passing loaded permissions)
    // To be efficient, we should load permissions during Guard execution or in the JWT payload
}

// Deprecated enum for backward compatibility if needed, but we should use strings now.
export enum Permission {
    // Audit Permissions
    AUDIT_CREATE = 'AUDIT_CREATE',
    AUDIT_VIEW_SELF = 'AUDIT_VIEW_SELF',
    AUDIT_VIEW_TEAM = 'AUDIT_VIEW_TEAM',
    AUDIT_VIEW_ALL = 'AUDIT_VIEW_ALL',
    AUDIT_DELETE = 'AUDIT_DELETE',

    // Dispute Permissions
    DISPUTE_CREATE = 'DISPUTE_CREATE',
    DISPUTE_RESOLVE = 'DISPUTE_RESOLVE',
    DISPUTE_REAPPEAL = 'DISPUTE_REAPPEAL',
    DISPUTE_FINAL_VERDICT = 'DISPUTE_FINAL_VERDICT',

    // Form Permissions
    FORM_CREATE = 'FORM_CREATE',
    FORM_EDIT = 'FORM_EDIT',
    FORM_ARCHIVE = 'FORM_ARCHIVE',

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

    // Page Access
    PAGE_DASHBOARD = 'PAGE_DASHBOARD',
    PAGE_DOSSIER = 'PAGE_DOSSIER',
    PAGE_FORMS = 'PAGE_FORMS',
    PAGE_AUDITS = 'PAGE_AUDITS',
    PAGE_EVALUATE = 'PAGE_EVALUATE',
    PAGE_CALIBRATION = 'PAGE_CALIBRATION',
    PAGE_ADMIN = 'PAGE_ADMIN',
}
