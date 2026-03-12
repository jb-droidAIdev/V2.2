import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
// Refreshing types
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async findByName(name: string): Promise<User | null> {
    if (!name) return null;
    return this.prisma.user.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
    });
  }

  async findOne(identifier: string): Promise<User | null> {
    if (!identifier) return null;

    return this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email: {
              equals: identifier.toLowerCase().trim(),
              mode: 'insensitive',
            },
          },
          { eid: identifier.trim() },
        ],
      },
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
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
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
  }

  async findAll(user?: any, options?: { limit?: number; offset?: number }) {
    try {
      const where: any = { isActive: true };

      const userRoleStr = String(user?.role || '').toUpperCase();
      const isManagerOrQA = [
        'QA',
        'QA_TL',
        'QA_MANAGER',
        'OPS_TL',
        'OPS_MANAGER',
        'SDM',
      ].includes(userRoleStr);

      // RBAC: Non-admin management roles see only users from their assigned campaigns
      if (user && isManagerOrQA && userRoleStr !== 'ADMIN') {
        const assignments = await this.prisma.campaignQA.findMany({
          where: { userId: user.id },
          include: { campaign: true },
        });
        const campaignNames = assignments
          .filter((a) => a.campaign)
          .map((a) => a.campaign.name);

        const managementRoles = [
          'ADMIN',
          'QA',
          'QA_TL',
          'QA_MANAGER',
          'OPS_TL',
          'OPS_MANAGER',
          'SDM',
        ];

        const hasCampaignManage =
          user.permissions?.includes('CAMPAIGN_MANAGE') ||
          user.permissions?.includes('*');

        where.OR = [
          { employeeTeam: user.employeeTeam },
          { employeeTeam: { in: campaignNames } },
        ];

        // If they have Campaign Manage, they MUST be able to see all management profiles
        // (the "Non Agents" tab in Dossier) to perform assignments
        if (hasCampaignManage) {
          where.OR.push({ role: { in: managementRoles } });
        }
      }

      const queryOptions: any = {
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          eid: true,
          systemId: true,
          billable: true,
          employeeTeam: true,
          projectCode: true,
          supervisor: true,
          manager: true,
          sdm: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      };

      if (options?.limit) {
        queryOptions.take = Number(options.limit);
        queryOptions.skip = Number(options.offset || 0);
      }

      const results = await this.prisma.user.findMany(queryOptions);
      
      // Separate query for total count using the EXACT same where filter
      const total = await this.prisma.user.count({ where: queryOptions.where });

      return options?.limit ? { data: results, total } : results;
    } catch (error) {
      console.error('CRITICAL: UsersService.findAll Error:', error);
      throw error;
    }
  }

  async findByTeam(teamName: string, requestingUserId?: string) {
    // Enforce strict team filtering for everyone (Admin, QA, etc.)
    // This ensures that when evaluating a specific campaign, you only see its agents.
    return this.prisma.user.findMany({
      where: {
        employeeTeam: teamName,
        role: Role.AGENT,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        eid: true,
        supervisor: true,
        manager: true,
        sdm: true,
        employeeTeam: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: any) {
    const { password, ...userData } = data;
    const defaultPassword = `Fws@${userData.eid || '12345'}`;
    const hashedPassword = await bcrypt.hash(password || defaultPassword, 10);

    // Dynamic RBAC: Get Role ID
    const targetRole = userData.role || 'AGENT';
    const userRole = await this.prisma.userRole.findUnique({
      where: { name: targetRole },
    });

    // Sanitize string fields and exclude internal keys
    const sanitizedData = Object.entries(userData).reduce(
      (acc, [key, value]) => {
        // Exclude internal fields that shouldn't be set manually during create
        if (['id', 'createdAt', 'updatedAt'].includes(key)) return acc;

        if (typeof value === 'string') {
          acc[key] = value.trim();
        } else {
          acc[key] = value;
        }
        return acc;
      },
      {} as any,
    );

    return this.prisma.user.create({
      data: {
        ...sanitizedData,
        password: hashedPassword,
        mustChangePassword: true,
        roleId: userRole?.id,
      },
    });
  }

  async bulkCreate(users: any[]) {
    const chunkSize = 100;
    let processedCount = 0;

    // Track valid EIDs/Emails from this upload to identify who stayed
    const activeEids = users.filter((u) => u.eid).map((u) => String(u.eid));
    const activeEmails = users
      .filter((u) => !u.eid && u.email)
      .map((u) => u.email);

    // Pre-fetch all dynamic roles to map them
    const allRoles = await this.prisma.userRole.findMany();
    const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));

    for (const u of users) {
      const role = (u.role as Role) || Role.AGENT;
      const billable =
        u.billable === true ||
        u.billable === 'true' ||
        u.billable === 'Yes';
      const roleId = roleMap.get(role);

      // Robust lookup: Search by EID or Email (case-insensitive)
      const existingUser = await this.findOne(u.eid || u.email);

      const userData = {
        name: u.name,
        role: role,
        billable: billable,
        employeeTeam: u.employeeTeam,
        projectCode: u.projectCode,
        supervisor: u.supervisor,
        manager: u.manager,
        sdm: u.sdm,
        systemId: u.systemId ? String(u.systemId).trim() : null,
        isActive: true,
      };

      try {
        if (existingUser) {
          // UPDATE EXISTING: Never touch password or mustChangePassword
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              ...userData,
              // Ensure email stays consistent with file if provided
              ...(u.email ? { email: u.email.toLowerCase().trim() } : {}),
              // Ensure EID stays consistent with file if provided
              ...(u.eid ? { eid: String(u.eid).trim() } : {}),
              // Update dynamic role mapping
              roleId: roleId,
              role: role,
            },
          });
        } else {
          // CREATE NEW
          const defaultPassStr = `Fws@${u.eid ? String(u.eid).trim() : '12345'}`;
          const defaultPassword = await bcrypt.hash(defaultPassStr, 10);
          await this.prisma.user.create({
            data: {
              ...userData,
              email: u.email
                ? u.email.toLowerCase().trim()
                : u.eid
                  ? `${String(u.eid).trim()}@flatworld.ph`
                  : `user-${Math.random().toString(36).substring(7)}@placeholder.com`,
              eid: u.eid ? String(u.eid).trim() : null,
              password: defaultPassword,
              mustChangePassword: true,
              roleId: roleId,
            },
          });
        }
        processedCount++;
      } catch (err) {
        console.error(`Failed to process user ${u.name || u.eid || u.email}:`, err);
        // Continue to next user instead of failing the whole batch
      }
    }


    // --- ATTRITION RECONCILIATION ---
    // Any AGENT who is currently active but NOT in the incoming file should be deactivated
    await this.prisma.user.updateMany({
      where: {
        role: Role.AGENT,
        isActive: true,
        NOT: [{ eid: { in: activeEids } }, { email: { in: activeEmails } }],
      },
      data: { isActive: false },
    });

    return { count: processedCount };
  }

  async getUniqueTeams() {
    const teams = await this.prisma.user.findMany({
      where: {
        NOT: [{ employeeTeam: null }, { employeeTeam: '' }],
      },
      select: {
        employeeTeam: true,
        projectCode: true,
      },
    });

    // Group by team and pick first projectCode
    const teamMap = new Map<string, string | null>();
    teams.forEach((t) => {
      if (t.employeeTeam && !teamMap.has(t.employeeTeam)) {
        teamMap.set(t.employeeTeam, t.projectCode || null);
      }
    });

    return Array.from(teamMap.entries()).map(([name, projectCode]) => ({
      name,
      projectCode,
    }));
  }

  async updateLoginMetadata(
    id: string,
    data: {
      failedLoginAttempts?: number;
      lockoutUntil?: Date | null;
      lastLoginAt?: Date;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updatePassword(id: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async bulkUpdateTeam(oldTeamName: string, newTeamName: string) {
    return this.prisma.user.updateMany({
      where: { employeeTeam: oldTeamName },
      data: { employeeTeam: newTeamName },
    });
  }

  async bulkResetRole(roleName: string) {
    return this.prisma.user.updateMany({
      where: { role: roleName as any },
      data: {
        role: '' as any,
        roleId: null,
        employeeTeam: 'Unassigned',
      },
    });
  }

  // Scoped update — only sets employeeTeam, used by CAMPAIGN_MANAGE endpoints
  async assignUsersToTeam(userIds: string[], teamName: string) {
    // 1. Always update employeeTeam
    const updateResult = await this.prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { employeeTeam: teamName },
    });

    // 2. Dynamic Role Sync: If teamName is a known management role, update user roles too
    // This allows the "Add Member" action in Dossier (Admin View) to correctly set permissions
    const targetRole = await this.prisma.userRole.findUnique({
      where: { name: teamName },
    });

    if (targetRole && teamName !== 'AGENT') {
      await this.prisma.user.updateMany({
        where: { id: { in: userIds } },
        data: {
          role: teamName as any,
          roleId: targetRole.id,
        },
      });
    }

    return updateResult;
  }

  async updateUser(id: string, data: any) {
    // If role is being updated, we must update the roleId mapping
    const { id: _, createdAt, updatedAt, ...allowedData } = data;
    const updateData = { ...allowedData };

    if (allowedData.role !== undefined) {
      if (allowedData.role === '') {
        updateData.roleId = null;
        updateData.employeeTeam = 'Unassigned';
      } else {
        const userRole = await this.prisma.userRole.findUnique({
          where: { name: allowedData.role },
        });
        if (userRole) {
          updateData.roleId = userRole.id;
          // Synchronize Team with Role for management users
          if (allowedData.role !== 'AGENT') {
            updateData.employeeTeam = allowedData.role;
          }
        }
      }
    }

    // Handle password update if provided
    if (allowedData.password && allowedData.password.trim() !== '') {
      updateData.password = await bcrypt.hash(allowedData.password, 10);
      // Default to forcing a change if set via general update (admin action)
      updateData.mustChangePassword = allowedData.mustChangePassword ?? true;
    } else {
      // Remove empty password from update to avoid overwriting with empty string
      delete updateData.password;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async findAllRoles() {
    return this.prisma.userRole.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRole(name: string, description?: string) {
    return this.prisma.userRole.create({
      data: {
        name,
        description,
        isSystem: false,
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async deleteRole(roleId: string) {
    const role = await this.prisma.userRole.findUnique({
      where: { id: roleId },
    });

    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem)
      throw new BadRequestException('Cannot delete system roles');

    // Automatically migrate users to empty role and Unassigned team before deletion
    await this.prisma.user.updateMany({
      where: { roleId: role.id },
      data: {
        role: '' as any,
        roleId: null,
        employeeTeam: 'Unassigned',
      },
    });

    return this.prisma.userRole.delete({
      where: { id: roleId },
    });
  }

  async updateRole(
    roleId: string,
    data: { name?: string; description?: string },
  ) {
    const role = await this.prisma.userRole.findUnique({
      where: { id: roleId },
    });

    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem && data.name && data.name !== role.name)
      throw new BadRequestException('Cannot rename system roles');

    // 1. If name changes, we MUST update all users' role and employeeTeam strings
    if (data.name && data.name !== role.name) {
      await this.prisma.user.updateMany({
        where: { roleId: role.id },
        data: {
          role: data.name as any,
          employeeTeam: data.name,
        },
      });
    }

    return this.prisma.userRole.update({
      where: { id: roleId },
      data,
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async updateRolePermissions(roleId: string, permissionCodes: string[]) {
    // 1. Get all permission IDs for the codes
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    // 2. Clear existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // 3. Add new ones
    if (permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
      });
    }

    return this.findAllRoles(); // Return updated list
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { module: 'asc' },
    });
  }

  async getAssignedCampaigns(userId: string) {
    try {
      const assignments = await this.prisma.campaignQA.findMany({
        where: { userId },
        include: {
          campaign: true,
          form: { select: { id: true, name: true } },
        } as any,
      });

      return (assignments as any[])
        .filter((a) => a.campaign !== null) // Safety check: Skip orphaned assignments
        .map((a) => ({
          ...a.campaign,
          assignedFormId: a.formId || null,
          assignedFormName: a.form?.name || null,
        }));
    } catch (error) {
      console.error(
        `Error fetching assigned campaigns for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async assignCampaigns(
    userId: string,
    assignments: { campaignId: string; formId?: string | null }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Remove all existing assignments
      await tx.campaignQA.deleteMany({
        where: { userId },
      });

      // 2. Create new assignments (with optional form pinning)
      if (assignments.length > 0) {
        await tx.campaignQA.createMany({
          data: assignments.map(({ campaignId, formId }) => ({
            userId,
            campaignId,
            formId: formId || null,
          })),
        });
      }
    });
  }
}
