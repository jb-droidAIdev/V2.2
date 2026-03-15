import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SlaEngineService } from '../sla-engine/sla-engine.service';
import { Campaign } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private slaEngine: SlaEngineService,
  ) { }

  async findAll(user?: any) {
    try {
      // Auto-sync teams from users to campaigns before returning
      await this.syncTeamsWithCampaigns();

      const where: any = { isActive: true };

      if (user) {
        const role = String(user.role || '').toUpperCase();
        const hasCampaignManage =
          user.permissions?.includes('CAMPAIGN_MANAGE') ||
          user.permissions?.includes('*');

        const isSuperAdmin =
          ['ADMIN', 'QA_MANAGER'].includes(role) || hasCampaignManage;

        if (!isSuperAdmin) {
          // Restricted managers see their assignments + ADMIN folders
          where.OR = [
            { qaAssignments: { some: { userId: user.id } } },
            { type: 'ADMIN' },
          ];
        }
      }

      return await this.prisma.campaign.findMany({
        where,
        include: {
          _count: {
            select: { qaAssignments: true, forms: true },
          },
        },
      });
    } catch (error) {
      console.error('CampaignsService.findAll Error:', error);
      throw error;
    }
  }

  async findAllWithForms() {
    // 1. Auto-sync teams from users to campaigns
    await this.syncTeamsWithCampaigns();

    // 2. Return all active campaigns (USER and ADMIN) with their active forms for the access assignment UI
    return this.prisma.campaign.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        projectCode: true,
        type: true,
        forms: {
          where: { isArchived: false },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAssigned(userId: string) {
    if (!userId) {
      console.warn('findAssigned called without userId');
      return [];
    }

    try {
      // Check if user is admin or above
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, name: true, employeeTeam: true },
      });

      if (!user) {
        console.warn('User not found in findAssigned:', userId);
        return [];
      }

      const isSuperAdmin = user && ['ADMIN', 'QA_MANAGER'].includes(user.role);

      const activeForms = await this.prisma.monitoringForm.findMany({
        where: {
          isArchived: false,
          versions: { some: { isActive: true } },
        },
        select: { id: true, campaignId: true, teamName: true, name: true },
      });

      const activeTeamNames = new Set(
        activeForms.map((f) => f.teamName).filter(Boolean),
      );

      const campaignSelect: any = {
        id: true,
        name: true,
        projectCode: true,
        type: true,
        forms: {
          where: {
            isArchived: false,
            versions: { some: { isActive: true } },
          },
          select: { id: true, name: true },
        },
      };

      let campaigns;
      if (isSuperAdmin) {
        campaigns = await this.prisma.campaign.findMany({
          where: { isActive: true },
          select: campaignSelect,
        });
      } else {
        campaigns = await this.prisma.campaign.findMany({
          where: {
            isActive: true,
            qaAssignments: { some: { userId } },
          },
          select: campaignSelect,
        });
      }

      if (!campaigns) return [];

      return campaigns
        .flatMap((campaign: any) => {
          const forms = campaign.forms || [];
          
          if (forms.length === 0) {
            // Fallback for campaigns with no direct form link, search by team name matching
            const teamForm = activeForms.find((f: any) => f.teamName === campaign.name);
            
            // Focus: If a campaign has completely NO forms, hide it from the dropdown
            if (!teamForm) return [];

            return [
              {
                id: teamForm.id,
                name: campaign.name || 'Unnamed Campaign',
                projectCode: campaign.projectCode || null,
                type: campaign.type || 'USER',
                scorecardName: teamForm.name,
              },
            ];
          }

          // Return one entry per form for this campaign
          return forms.map((form: any) => ({
            id: form.id, // Provide Form ID as the primary selection ID
            name: campaign.name || 'Unnamed Campaign',
            projectCode: campaign.projectCode || null,
            type: campaign.type || 'USER',
            scorecardName: form.name,
          }));
        });
    } catch (error) {
      console.error('CampaignsService.findAssigned Error:', error);
      throw error;
    }
  }

  async findOneDetail(id: string) {
    // 1. Resolve ID (could be Campaign ID or Form ID)
    let campaignId = id;
    const formCheck = await this.prisma.monitoringForm.findUnique({
      where: { id },
      select: { campaignId: true },
    });
    if (formCheck?.campaignId) {
      campaignId = formCheck.campaignId;
    }

    return this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        qaAssignments: {
          include: { user: true },
        },
        forms: {
          include: {
            _count: {
              select: { versions: true },
            },
          },
        },
        _count: {
          select: { forms: true },
        },
      },
    });
  }

  async create(data: {
    name: string;
    projectCode?: string;
    type?: any;
    samplingRate?: number;
    stratification?: any;
    assignedUserIds?: string[];
    ztpWindowDays?: number;
    ztpMilestones?: number[];
    ztpAckSlaHours?: number;
    disputeWindowDays?: number;
    reappealWindowDays?: number;
    coachingReleaseWindowDays?: number;
    coachingCompletionWindowDays?: number;
    coachingAckWindowDays?: number;
  }) {
    // Uniqueness check: One configuration per team/name
    const existing = await this.prisma.campaign.findFirst({
      where: { name: data.name, isActive: true },
    });

    if (existing) {
      throw new Error(
        `A configuration for team "${data.name}" already exists.`,
      );
    }

    const { assignedUserIds, ...campaignData } = data;
    return this.prisma.campaign.create({
      data: {
        ...campaignData,
        qaAssignments: {
          create: (assignedUserIds || []).map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        qaAssignments: true,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      samplingRate?: number;
      stratification?: any;
      assignedUserIds?: string[];
      ztpWindowDays?: number;
      ztpMilestones?: number[];
      ztpAckSlaHours?: number;
      disputeWindowDays?: number;
      reappealWindowDays?: number;
      coachingReleaseWindowDays?: number;
      coachingCompletionWindowDays?: number;
      coachingAckWindowDays?: number;
    },
  ) {
    const { assignedUserIds, ...updateData } = data;

    // If assignedUserIds is provided, we sync the assignments
    if (assignedUserIds) {
      await this.prisma.campaignQA.deleteMany({
        where: { campaignId: id },
      });

      if (assignedUserIds.length > 0) {
        await this.prisma.campaignQA.createMany({
          data: assignedUserIds.map((userId) => ({
            campaignId: id,
            userId,
          })),
        });
      }
    }

    // If SLA changes, update all active (RELEASED) audits that haven't been acknowledged yet
    if (updateData.ztpAckSlaHours !== undefined) {
      const activeAudits = await this.prisma.audit.findMany({
        where: {
          campaignId: id,
          status: 'RELEASED',
          releasedAt: { not: null },
        },
        select: { id: true, releasedAt: true },
      });

      const slaHours = updateData.ztpAckSlaHours;
      const slaDays = Math.max(1, Math.round(slaHours / 24));

      for (const audit of activeAudits) {
        if (!audit.releasedAt) continue;

        // Use the same SLA engine logic as ReleaseService/AuditService
        const newDeadline = await this.slaEngine.calculateDueDate(
          new Date(audit.releasedAt),
          slaDays,
          id
        );

        await this.prisma.audit.update({
          where: { id: audit.id },
          data: { agentAckDeadline: newDeadline },
        });
      }
    }

    return this.prisma.campaign.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Archive all forms associated with this campaign
      // This ensures scorecards can no longer be used for new audits
      await tx.monitoringForm.updateMany({
        where: { campaignId: id },
        data: { isArchived: true },
      });

      // 2. Remove QA Assignments to revoke access immediately
      await tx.campaignQA.deleteMany({
        where: { campaignId: id },
      });

      // 3. Perform Soft-Delete on the campaign
      // Data (Audits, Coaching Logs, Tickets) is RETAINED for historical reporting
      return tx.campaign.update({
        where: { id },
        data: { isActive: false },
      });
    });
  }

  async assignQa(campaignId: string, userId: string) {
    return this.prisma.campaignQA.create({
      data: {
        campaignId,
        userId,
      },
    });
  }

  private static lastSync: number = 0;
  private async syncTeamsWithCampaigns() {
    const now = Date.now();
    // Cache sync for 1 minute to prevent pounding the DB on every list fetch
    if (now - CampaignsService.lastSync < 60000) return;
    CampaignsService.lastSync = now;

    try {
      // 1. Get unique team/project/role triplets efficiently
      const distinctUsers = await this.prisma.user.findMany({
        where: { NOT: [{ employeeTeam: null }, { employeeTeam: '' }] },
        select: { employeeTeam: true, projectCode: true, role: true },
        distinct: ['employeeTeam', 'projectCode', 'role'],
      });

      if (distinctUsers.length === 0) return;

      const teamDataMap = new Map<
        string,
        { projectCode: string | null; hasAgents: boolean }
      >();
      distinctUsers.forEach((u) => {
        const team = u.employeeTeam;
        const current = teamDataMap.get(team) || {
          projectCode: u.projectCode || null,
          hasAgents: false,
        };
        if (u.role === 'AGENT') current.hasAgents = true;
        if (!current.projectCode && u.projectCode)
          current.projectCode = u.projectCode;
        teamDataMap.set(team, current);
      });

      const existingCampaigns = await this.prisma.campaign.findMany({
        where: { isActive: true },
        select: { id: true, name: true, projectCode: true, type: true },
      });

      const campaignMap = new Map(
        existingCampaigns.map((c) => [c.name.toLowerCase(), c]),
      );
      const toCreate: any[] = [];
      const toUpdate: { id: string; data: any }[] = [];

      for (const [name, data] of teamDataMap.entries()) {
        const lowerName = name.toLowerCase();
        const existing = campaignMap.get(lowerName);
        const targetType: any = data.hasAgents ? 'USER' : 'ADMIN';

        if (!existing) {
          toCreate.push({
            name,
            projectCode: data.projectCode,
            type: targetType,
            isActive: true,
          });
        } else {
          const updates: any = {};
          if (!existing.projectCode && data.projectCode)
            updates.projectCode = data.projectCode;
          if (!existing.type || (existing.type === 'ADMIN' && data.hasAgents)) {
            updates.type = 'USER';
          }
          if (Object.keys(updates).length > 0) {
            toUpdate.push({ id: existing.id, data: updates });
          }
        }
      }

      // 4. Batch Execution
      if (toCreate.length > 0) {
        await this.prisma.campaign.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
      }

      if (toUpdate.length > 0) {
        await this.prisma.$transaction(
          toUpdate.map((u) =>
            this.prisma.campaign.update({ where: { id: u.id }, data: u.data }),
          ),
        );
      }
    } catch (err) {
      console.error('CRITICAL: syncTeamsWithCampaigns error:', err);
      // Log more details if it's a Prisma error
      if (err.code) console.error(`Prisma Error Code: ${err.code} | Message: ${err.message}`);
    }
  }
}
