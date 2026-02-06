import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findOne(identifier: string): Promise<User | null> {
        if (!identifier) return null;

        return this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: identifier.toLowerCase().trim(), mode: 'insensitive' } },
                    { eid: identifier.trim() }
                ]
            },
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findAll(user?: any) {
        let where: any = { isActive: true };

        // RBAC: TLs see their own team + any campaign they are assigned to
        if (user && [Role.QA_TL, Role.QA_MANAGER, Role.OPS_TL, Role.OPS_MANAGER, Role.SDM].includes(user.role)) {
            const assignments = await this.prisma.campaignQA.findMany({
                where: { userId: user.id },
                include: { campaign: true }
            });
            const campaignNames = assignments.map(a => a.campaign.name);

            where.OR = [
                { employeeTeam: user.employeeTeam },
                { employeeTeam: { in: campaignNames } },
                { role: { in: [Role.QA, Role.QA_TL] } } // Allow seeing the QA staff folder in Dossier
            ];
        }

        return this.prisma.user.findMany({
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
            orderBy: { name: 'asc' }
        });
    }

    async findByTeam(teamName: string, requestingUserId?: string) {
        // Enforce strict team filtering for everyone (Admin, QA, etc.)
        // This ensures that when evaluating a specific campaign, you only see its agents.
        return this.prisma.user.findMany({
            where: {
                employeeTeam: teamName,
                role: Role.AGENT,
                isActive: true
            },
            select: {
                id: true,
                email: true,
                name: true,
                eid: true,
                supervisor: true,
                manager: true,
                sdm: true,
                employeeTeam: true
            },
            orderBy: { name: 'asc' }
        });
    }

    async create(data: any) {
        const { password, ...userData } = data;
        const hashedPassword = await bcrypt.hash(password || 'Standard123!', 10);

        // Sanitize string fields
        const sanitizedData = Object.entries(userData).reduce((acc, [key, value]) => {
            if (typeof value === 'string') {
                acc[key] = value.trim();
            } else {
                acc[key] = value;
            }
            return acc;
        }, {} as any);

        return this.prisma.user.create({
            data: {
                ...sanitizedData,
                password: hashedPassword,
                mustChangePassword: true
            }
        });
    }

    async bulkCreate(users: any[]) {
        const chunkSize = 100;
        let processedCount = 0;

        // Track valid EIDs/Emails from this upload to identify who stayed
        const activeEids = users.filter(u => u.eid).map(u => String(u.eid));
        const activeEmails = users.filter(u => !u.eid && u.email).map(u => u.email);

        for (let i = 0; i < users.length; i += chunkSize) {
            const userChunk = users.slice(i, i + chunkSize);

            await Promise.all(userChunk.map(async (u) => {
                const role = u.role as Role || Role.AGENT;
                const billable = u.billable === true || u.billable === 'true' || u.billable === 'Yes';

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
                    systemId: String(u.systemId || ''),
                    isActive: true,
                };

                if (existingUser) {
                    // UPDATE EXISTING: Never touch password or mustChangePassword
                    await this.prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            ...userData,
                            // Ensure email stays consistent with file if provided
                            ...(u.email ? { email: u.email.toLowerCase().trim() } : {}),
                            // Ensure EID stays consistent with file if provided
                            ...(u.eid ? { eid: String(u.eid).trim() } : {})
                        }
                    });
                } else {
                    // CREATE NEW
                    const defaultPassword = await bcrypt.hash('Standard123!', 10);
                    await this.prisma.user.create({
                        data: {
                            ...userData,
                            email: u.email ? u.email.toLowerCase().trim() : (u.eid ? `${u.eid.trim()}@flatworld.ph` : `user-${Math.random().toString(36).substring(7)}@placeholder.com`),
                            eid: u.eid ? String(u.eid).trim() : null,
                            password: defaultPassword,
                            mustChangePassword: true
                        }
                    });
                }
                processedCount++;
            }));
        }

        // --- ATTRITION RECONCILIATION ---
        // Any AGENT who is currently active but NOT in the incoming file should be deactivated
        await this.prisma.user.updateMany({
            where: {
                role: Role.AGENT,
                isActive: true,
                NOT: [
                    { eid: { in: activeEids } },
                    { email: { in: activeEmails } }
                ]
            },
            data: { isActive: false }
        });

        return { count: processedCount };
    }

    async getUniqueTeams() {
        const teams = await this.prisma.user.findMany({
            where: {
                NOT: [
                    { employeeTeam: null },
                    { employeeTeam: "" }
                ]
            },
            select: {
                employeeTeam: true
            },
            distinct: ['employeeTeam']
        });
        return teams.map(t => t.employeeTeam).filter(Boolean);
    }

    async updateLoginMetadata(id: string, data: { failedLoginAttempts?: number; lockoutUntil?: Date | null; lastLoginAt?: Date }) {
        return this.prisma.user.update({
            where: { id },
            data
        });
    }

    async updatePassword(id: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return this.prisma.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            } as any
        });
    }

    async remove(id: string) {
        return this.prisma.user.delete({
            where: { id }
        });
    }

    async bulkUpdateTeam(oldTeamName: string, newTeamName: string) {
        return this.prisma.user.updateMany({
            where: { employeeTeam: oldTeamName },
            data: { employeeTeam: newTeamName }
        });
    }

    async updateUser(id: string, data: any) {
        return this.prisma.user.update({
            where: { id },
            data
        });
    }

    async getAssignedCampaigns(userId: string) {
        const assignments = await this.prisma.campaignQA.findMany({
            where: { userId },
            include: { campaign: true }
        });
        return assignments.map(a => a.campaign);
    }

    async assignCampaigns(userId: string, campaignIds: string[]) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Remove all existing assignments
            await tx.campaignQA.deleteMany({
                where: { userId }
            });

            // 2. Create new assignments
            if (campaignIds.length > 0) {
                await tx.campaignQA.createMany({
                    data: campaignIds.map(campaignId => ({
                        userId,
                        campaignId
                    }))
                });
            }
        });
    }
}
