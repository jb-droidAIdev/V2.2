import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Campaign } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user?: any) {
    try {
      // Auto-sync teams from users to campaigns before returning
      await this.syncTeamsWithCampaigns();

      const where: any = { isActive: true };

      if (user) {
        const role = String(user.role || '').toUpperCase();
        const isSuperAdmin = ['ADMIN', 'QA_MANAGER'].includes(role);

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
          select: { name: true },
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
        .filter((campaign: any) => {
          if (!campaign) return false;
          const hasActiveDirectForm = (campaign.forms || []).length > 0;
          const hasActiveTeamForm =
            campaign.name && activeTeamNames.has(campaign.name);
          const isUserCampaign = campaign.type !== 'ADMIN';
          return (hasActiveDirectForm || hasActiveTeamForm) && isUserCampaign;
        })
        .map((campaign: any) => {
          let scorecardName = campaign.forms?.[0]?.name;
          if (!scorecardName) {
            const teamForm = activeForms.find(
              (f) => f && f.teamName === campaign.name,
            );
            scorecardName = teamForm?.name;
          }

          return {
            id: campaign.id,
            name: campaign.name || 'Unnamed Campaign',
            projectCode: campaign.projectCode || null,
            type: campaign.type || 'USER',
            scorecardName: scorecardName || 'Generic',
          };
        });
    } catch (error) {
      console.error('CampaignsService.findAssigned Error:', error);
      throw error;
    }
  }

  async findOneDetail(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
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

    return this.prisma.campaign.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Delete Assignments
      await tx.campaignQA.deleteMany({ where: { campaignId: id } });

      // 2. Identify forms to clean up audits that might reference them (even from other campaigns)
      const formVersions = await tx.monitoringFormVersion.findMany({
        where: { form: { campaignId: id } },
        select: { id: true },
      });
      const formVersionIds = formVersions.map((fv) => fv.id);

      // 2b. Identify all audits for this campaign OR using this campaign's forms
      const audits = await tx.audit.findMany({
        where: {
          OR: [{ campaignId: id }, { formVersionId: { in: formVersionIds } }],
        },
        select: { id: true },
      });
      const auditIds = audits.map((a) => a.id);

      if (auditIds.length > 0) {
        await tx.auditFieldValue.deleteMany({
          where: { auditId: { in: auditIds } },
        });
        await tx.auditScore.deleteMany({
          where: { auditId: { in: auditIds } },
        });
        await tx.auditEvent.deleteMany({
          where: { auditId: { in: auditIds } },
        });
        await tx.auditUserView.deleteMany({
          where: { auditId: { in: auditIds } },
        });
        await tx.releaseRecord.deleteMany({
          where: { auditId: { in: auditIds } },
        });

        // Calibration entries tied to audits
        await tx.calibrationAnchor.deleteMany({
          where: { auditId: { in: auditIds } },
        });
        await tx.calibrationTicket.deleteMany({
          where: { auditId: { in: auditIds } },
        });

        // Disputes
        const disputes = await tx.dispute.findMany({
          where: { auditId: { in: auditIds } },
          select: { id: true },
        });
        const disputeIds = disputes.map((d) => d.id);
        if (disputeIds.length > 0) {
          await tx.disputeItem.deleteMany({
            where: { disputeId: { in: disputeIds } },
          });
          await tx.dispute.deleteMany({ where: { id: { in: disputeIds } } });
        }

        await tx.audit.deleteMany({ where: { id: { in: auditIds } } });
      }

      // 3. Delete Sampling Runs & Sampled Tickets
      const runs = await tx.samplingRun.findMany({
        where: { campaignId: id },
        select: { id: true },
      });
      const runIds = runs.map((r) => r.id);
      if (runIds.length > 0) {
        await tx.sampledTicket.deleteMany({ where: { runId: { in: runIds } } });
        await tx.samplingRun.deleteMany({ where: { id: { in: runIds } } });
      }

      // 4. Delete Calibration Sessions
      // (This will cascade to scores, participants, results, etc. due to schema onDelete: Cascade)
      await tx.calibrationSession.deleteMany({ where: { campaignId: id } });

      // 5. Delete Tickets & Batches (Robust check for tickets in batches)
      const batches = await tx.ticketUploadBatch.findMany({
        where: { campaignId: id },
        select: { id: true },
      });
      const batchIds = batches.map((b) => b.id);

      await tx.uploadedTicket.deleteMany({
        where: {
          OR: [{ campaignId: id }, { batchId: { in: batchIds } }],
        },
      });
      await tx.ticketUploadBatch.deleteMany({ where: { campaignId: id } });

      // 6. Delete Forms (and versions)
      const forms = await tx.monitoringForm.findMany({
        where: { campaignId: id },
        select: { id: true },
      });
      const formIds = forms.map((f) => f.id);
      if (formIds.length > 0) {
        const versions = await tx.monitoringFormVersion.findMany({
          where: { formId: { in: formIds } },
          select: { id: true },
        });
        const versionIds = versions.map((v) => v.id);
        if (versionIds.length > 0) {
          await tx.formCriterion.deleteMany({
            where: { formVersionId: { in: versionIds } },
          });
          await tx.monitoringFormVersion.deleteMany({
            where: { id: { in: versionIds } },
          });
        }
        await tx.monitoringForm.deleteMany({ where: { id: { in: formIds } } });
      }

      // 7. Delete Campaign
      return tx.campaign.delete({ where: { id } });
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
      console.error('syncTeamsWithCampaigns error:', err);
    }
  }
}
