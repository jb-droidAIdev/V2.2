import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FormsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(archived: boolean = false) {
    try {
      const forms = await this.prisma.monitoringForm.findMany({
        where: { isArchived: archived },
        include: {
          campaign: true,
          versions: {
            where: { isActive: true },
            include: {
              creator: {
                select: { name: true, email: true },
              },
              _count: {
                select: {
                  audits: true,
                  criteria: true,
                },
              },
            },
            take: 1,
          },
          _count: {
            select: { versions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Narrow audit check to only displayed forms
      const idsWithAudits = new Set();
      if (forms.length > 0) {
        const auditCheck = await this.prisma.monitoringForm.findMany({
          where: {
            id: { in: forms.map((f) => f.id) },
            versions: {
              some: { audits: { some: {} } },
            },
          },
          select: { id: true },
        });
        auditCheck.forEach((f) => idsWithAudits.add(f.id));
      }

      return forms.map((form) => ({
        ...form,
        hasAudits: idsWithAudits.has(form.id),
      }));
    } catch (error) {
      console.error('FormsService.findAll Error:', error);
      throw error;
    }
  }

  async getDrafts() {
    return this.prisma.monitoringForm.findMany({
      where: {
        isConfigured: false,
        isArchived: false,
      },
      include: {
        campaign: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.monitoringForm.findUnique({
      where: { id },
      include: {
        campaign: {
          include: {
            qaAssignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
        versions: {
          where: { isActive: true },
          include: { criteria: true },
          take: 1,
        },
      },
    });
  }

  async getAssignedQAs(formId: string) {
    const form = await this.prisma.monitoringForm.findUnique({
      where: { id: formId },
      select: { campaignId: true, teamName: true },
    });

    if (!form) throw new BadRequestException('Form not found');

    let campaignId = form.campaignId;

    // Fallback to name-based lookup if no explicit campaignId
    if (!campaignId && form.teamName) {
      const campaign = await this.prisma.campaign.findFirst({
        where: { name: form.teamName, isActive: true },
      });
      campaignId = campaign?.id;
    }

    if (!campaignId) return [];

    const assignments = await this.prisma.campaignQA.findMany({
      where: { campaignId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            eid: true,
          },
        },
      },
    });

    return assignments.map((a) => a.user);
  }

  async assignQAs(formId: string, userIds: string[]) {
    const form = await this.prisma.monitoringForm.findUnique({
      where: { id: formId },
      select: { campaignId: true, teamName: true, name: true },
    });

    if (!form) throw new BadRequestException('Form not found');

    let campaignId = form.campaignId;

    // 1. Resolve or Create Campaign
    if (!campaignId && form.teamName) {
      const existingCampaign = await this.prisma.campaign.findFirst({
        where: { name: form.teamName, isActive: true },
      });

      if (existingCampaign) {
        campaignId = existingCampaign.id;
        // Update form to link to this campaign
        await this.prisma.monitoringForm.update({
          where: { id: formId },
          data: { campaignId },
        });
      } else {
        // Auto-create a campaign to anchor this form
        const newCampaign = await this.prisma.campaign.create({
          data: {
            name: form.teamName,
            type: 'USER',
            isActive: true,
          },
        });
        campaignId = newCampaign.id;
        await this.prisma.monitoringForm.update({
          where: { id: formId },
          data: { campaignId },
        });
      }
    }

    if (!campaignId) {
      throw new BadRequestException(
        'Could not resolve campaign for this form assignment.',
      );
    }

    // 2. Sync Assignments
    return this.prisma.$transaction(async (tx) => {
      // Remove existing assignments for this specific FORM
      await tx.campaignQA.deleteMany({
        where: { campaignId, formId },
      });

      // Add new assignments pinned to this form
      if (userIds.length > 0) {
        await tx.campaignQA.createMany({
          data: userIds.map((userId) => ({
            campaignId: campaignId,
            userId,
            formId: formId,
          })),
        });
      }

      return { success: true, count: userIds.length };
    });
  }

  async create(data: {
    campaignId?: string;
    teamName: string;
    name: string;
    description?: string;
    assignedUserIds?: string[];
    dispositions?: string[];
  }) {
    if (!data.name?.trim()) throw new Error('Form name is required');

    let targetCampaignId = data.campaignId;

    // If no campaignId provided, check if we should link to or create one based on teamName
    if (!targetCampaignId && data.teamName) {
      const existingCampaign = await this.prisma.campaign.findFirst({
        where: { name: data.teamName, isActive: true },
      });

      if (existingCampaign) {
        targetCampaignId = existingCampaign.id;
      } else {
        // Auto-create a campaign to anchor this form
        const newCampaign = await this.prisma.campaign.create({
          data: {
            name: data.teamName,
            type: 'USER',
            isActive: true,
          },
        });
        targetCampaignId = newCampaign.id;
      }
    }

    if (targetCampaignId) {
      const existing = await this.prisma.monitoringForm.findFirst({
        where: { campaignId: targetCampaignId, isArchived: false },
      });
      if (existing) {
        throw new Error(
          'A scorecard already exists for this configuration. Multiple forms per strategy are restricted.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const form = await tx.monitoringForm.create({
        data: {
          name: data.name,
          teamName: data.teamName,
          campaignId: targetCampaignId,
          description: data.description,
          isConfigured: false,
          dispositions: data.dispositions || [],
        },
      });

      // If QA assignments provided, sync them to the campaign
      if (
        targetCampaignId &&
        data.assignedUserIds &&
        data.assignedUserIds.length > 0
      ) {
        // Clear existing just in case (though it should be a new campaign or no assignments yet)
        await tx.campaignQA.deleteMany({
          where: { campaignId: targetCampaignId },
        });

        await tx.campaignQA.createMany({
          data: data.assignedUserIds.map((userId) => ({
            campaignId: targetCampaignId,
            userId,
          })),
        });
      }

      return form;
    });
  }

  async markConfigured(id: string) {
    return this.prisma.monitoringForm.update({
      where: { id },
      data: { isConfigured: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.monitoringForm.update({
      where: { id },
      data,
    });
  }

  async getVersions(formId: string) {
    return this.prisma.monitoringFormVersion.findMany({
      where: { formId },
      include: {
        creator: {
          select: { name: true, email: true },
        },
        _count: {
          select: { criteria: true, audits: true },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async findActiveByCampaign(campaignId: string, userId?: string) {
    // 1. First, find if this user has a specific form assigned for this campaign
    let pinnedFormId: string | null = null;
    if (userId) {
      const assignment = await this.prisma.campaignQA.findFirst({
        where: { campaignId, userId, isActive: true },
        select: { formId: true },
      });
      pinnedFormId = assignment?.formId || null;
    }

    // 2. Find the campaign to get its name (for fallback teamName lookup)
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) return null;

    // 3. Search for a form that matches either the pinned ID or the campaign/team
    const form = await this.prisma.monitoringForm.findFirst({
      where: {
        OR: [
          ...(pinnedFormId ? [{ id: pinnedFormId }] : []),
          { campaignId },
          { teamName: campaign.name, campaignId: null },
        ],
        isArchived: false,
      },
      include: {
        campaign: true,
        versions: {
          where: { isActive: true },
          include: {
            criteria: {
              where: { isActive: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
          take: 1,
          orderBy: { versionNumber: 'desc' },
        },
      },
      orderBy: { campaignId: 'desc' }, // Prioritize explicit campaign match over teamName match
    });

    if (!form) return null;

    // If the form is team-based (campaign relation is null), manually attach the campaign info
    // so the frontend can display the campaign name correctly.
    if (!form.campaign) {
      (form as any).campaign = campaign;
    }

    return form;
  }

  async createVersion(formId: string, data: any, creatorId?: string) {
    const last = await this.prisma.monitoringFormVersion.findFirst({
      where: { formId },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVer = (last?.versionNumber || 0) + 1;

    return this.prisma.monitoringFormVersion.create({
      data: {
        formId,
        versionNumber: nextVer,
        isActive: false,
        isDraft: true,
        creatorId,
        changeLog: data.changeLog,
        categories: data.categories || [],
        criteria: {
          create: (data.criteria || []).map((c: any) => ({
            categoryId: c.categoryId,
            categoryName: c.categoryName,
            title: c.title,
            description: c.description,
            weight: c.weight,
            isCritical: c.isCritical || false,
            orderIndex: c.orderIndex,
          })),
        },
      },
    });
  }

  async publishVersion(versionId: string) {
    const version = await this.prisma.monitoringFormVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new Error('Version not found');

    // 1. Discard all in-progress audits for this form before activating new version
    await this.auditService.discardAllByFormVersion(version.formId);

    // 2. Deactivate other versions
    await this.prisma.monitoringFormVersion.updateMany({
      where: { formId: version.formId },
      data: { isActive: false },
    });

    // 3. Activate this version
    return this.prisma.monitoringForm.update({
      where: { id: version.formId },
      data: {
        isConfigured: true,
        versions: {
          update: {
            where: { id: versionId },
            data: { isActive: true, isDraft: false, publishedAt: new Date() },
          },
        },
      },
    });
  }

  async archive(id: string) {
    return this.prisma.monitoringForm.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async remove(id: string) {
    const audits = await this.prisma.audit.findFirst({
      where: {
        formVersion: {
          formId: id,
        },
      },
    });

    if (audits) {
      throw new Error(
        'Cannot delete form that has existing audits. Use archive instead.',
      );
    }

    await this.prisma.formCriterion.deleteMany({
      where: {
        formVersion: {
          formId: id,
        },
      },
    });

    await this.prisma.monitoringFormVersion.deleteMany({
      where: { formId: id },
    });

    return this.prisma.monitoringForm.delete({
      where: { id },
    });
  }

  async findByCampaignOrTeam(campaignId?: string, teamName?: string) {
    return this.prisma.monitoringForm.findMany({
      where: {
        isArchived: false,
        isConfigured: true,
        OR: [
          { campaignId: campaignId || undefined },
          { teamName: teamName || undefined },
        ],
      },
      include: {
        versions: {
          where: { isActive: true },
          include: {
            _count: {
              select: { criteria: true },
            },
          },
          take: 1,
        },
      },
    });
  }

  async duplicate(
    sourceFormId: string,
    data: { name: string; campaignId?: string; teamName?: string },
    creatorId?: string,
  ) {
    console.log('Duplicating form:', { sourceFormId, data, creatorId });
    try {
      // 1. Get source form and its active version
      const sourceForm = await this.prisma.monitoringForm.findUnique({
        where: { id: sourceFormId },
        include: {
          versions: {
            where: { isActive: true },
            include: { criteria: true },
            take: 1,
            orderBy: { versionNumber: 'desc' },
          },
        },
      });

      if (!sourceForm) throw new BadRequestException('Source form not found');
      console.log('Source form found:', sourceForm.name);

      const sourceVersion = sourceForm.versions[0];
      if (!sourceVersion) {
        // Try to get the latest version if no active one exists
        console.log('No active version found, fetching latest draft...');
        const latestVersion = await this.prisma.monitoringFormVersion.findFirst(
          {
            where: { formId: sourceFormId },
            include: { criteria: true },
            orderBy: { versionNumber: 'desc' },
          },
        );

        if (!latestVersion)
          throw new BadRequestException(
            'Source form has no structure/versions to duplicate',
          );
        return this.performDuplicate(
          sourceForm,
          latestVersion,
          data,
          creatorId,
        );
      }

      return this.performDuplicate(sourceForm, sourceVersion, data, creatorId);
    } catch (error) {
      console.error('Duplicate failed:', error);
      throw error;
    }
  }

  private async performDuplicate(
    sourceForm: any,
    sourceVersion: any,
    data: { name: string; campaignId?: string; teamName?: string },
    creatorId?: string,
  ) {
    console.log(
      'Performing duplicate with version:',
      sourceVersion.versionNumber,
    );

    // 2. Check if target campaign already has a form
    if (data.campaignId) {
      const existing = await this.prisma.monitoringForm.findFirst({
        where: { campaignId: data.campaignId, isArchived: false },
      });
      if (existing) {
        throw new BadRequestException(
          'A scorecard already exists for the selected campaign.',
        );
      }
    } else if (data.teamName) {
      const existing = await this.prisma.monitoringForm.findFirst({
        where: { teamName: data.teamName, campaignId: null, isArchived: false },
      });
      if (existing) {
        throw new BadRequestException(
          'A scorecard already exists for the selected team.',
        );
      }
    }

    // 3. Create new Form
    const newForm = await this.prisma.monitoringForm.create({
      data: {
        name: data.name,
        campaignId: data.campaignId || null,
        teamName: data.teamName || sourceForm.teamName, // Use provided teamName or fallback to source
        isConfigured: true,
        dispositions: sourceForm.dispositions || [],
        description: `Duplicated from ${sourceForm.name}`,
      },
    });

    console.log('New form created:', newForm.id);

    // 4. Create new version with copied data
    const newVersion = await this.prisma.monitoringFormVersion.create({
      data: {
        formId: newForm.id,
        versionNumber: 1,
        isActive: true,
        isDraft: false,
        creatorId,
        publishedAt: new Date(),
        categories: sourceVersion.categories || [],
        criteria: {
          create: (sourceVersion.criteria || []).map((c: any) => ({
            categoryId: c.categoryId,
            categoryName: c.categoryName,
            title: c.title,
            description: c.description,
            weight: c.weight,
            isCritical: c.isCritical || false,
            orderIndex: c.orderIndex,
          })),
        },
      },
    });

    console.log('New version created:', newVersion.id);
    return { form: newForm, version: newVersion };
  }
}
