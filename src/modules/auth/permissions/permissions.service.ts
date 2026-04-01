import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  // Method to get permissions for a user from the database
  async getUserPermissions(userId: string): Promise<string[]> {
    if (!userId) return [];
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRole: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
        customPermissions: {
          include: { permission: true },
        },
      },
    });

    if (!user) return [];

    const rolePermissions =
      user.userRole?.permissions.map((p) => p.permission.code) || [];
    const customPermissions =
      user.customPermissions.map((p) => p.permission.code) || [];

    // Combine and distinct
    return Array.from(new Set([...rolePermissions, ...customPermissions]));
  }

  // Checking if a user has a permission (requires fetching user first or passing loaded permissions)
  // To be efficient, we should load permissions during Guard execution or in the JWT payload
}

// Canonical permission codes — must match the `code` column in the Permission table.
export enum Permission {
  // ── Page Access ────────────────────────────────────────────────────
  PAGE_DASHBOARD = 'PAGE_DASHBOARD',
  PAGE_DOSSIER = 'PAGE_DOSSIER',
  PAGE_AUDITS = 'PAGE_AUDITS',
  PAGE_EVALUATE = 'PAGE_EVALUATE',
  PAGE_CALIBRATION = 'PAGE_CALIBRATION',
  PAGE_FORMS = 'PAGE_FORMS',
  PAGE_ADMIN = 'PAGE_ADMIN',

  // ── System ─────────────────────────────────────────────────────────
  USER_MANAGE = 'USER_MANAGE',
  CAMPAIGN_MANAGE = 'CAMPAIGN_MANAGE',
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',
  WILDCARD = '*',

  // ── Audit ──────────────────────────────────────────────────────────
  AUDIT_CREATE = 'AUDIT_CREATE',
  AUDIT_VIEW_ALL = 'AUDIT_VIEW_ALL',
  AUDIT_VIEW_OWN = 'AUDIT_VIEW_OWN',
  AUDIT_VIEW_TEAM = 'AUDIT_VIEW_TEAM',
  AUDIT_ACKNOWLEDGE = 'AUDIT_ACKNOWLEDGE',
  AUDIT_DELETE = 'AUDIT_DELETE',
  AUDIT_COACH = 'AUDIT_COACH',
  AUDIT_IMPORT_LEGACY = 'AUDIT_IMPORT_LEGACY',
  COACHING_LOG_READ = 'COACHING_LOG_READ',

  // ── Dispute ────────────────────────────────────────────────────────
  DISPUTE_CREATE = 'DISPUTE_CREATE',
  DISPUTE_RESOLVE = 'DISPUTE_RESOLVE',
  DISPUTE_REAPPEAL = 'DISPUTE_REAPPEAL',
  DISPUTE_FINAL_VERDICT = 'DISPUTE_FINAL_VERDICT',

  // ── Calibration ────────────────────────────────────────────────────
  CALIBRATION_VIEW = 'CALIBRATION_VIEW',
  CALIBRATION_CREATE = 'CALIBRATION_CREATE',
  CALIBRATION_MANAGE = 'CALIBRATION_MANAGE',
  CALIBRATION_SCORE = 'CALIBRATION_SCORE',
  CALIBRATION_VALIDATE_ANCHOR = 'CALIBRATION_VALIDATE_ANCHOR',

  // ── Forms ──────────────────────────────────────────────────────────
  FORM_CREATE = 'FORM_CREATE',
  FORM_PUBLISH = 'FORM_PUBLISH',
  FORM_ARCHIVE = 'FORM_ARCHIVE',
  FORM_DELETE = 'FORM_DELETE',
  FORM_DUPLICATE = 'FORM_DUPLICATE',
}
