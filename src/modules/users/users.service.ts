import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findOne(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findAll() {
        return this.prisma.user.findMany({
            where: { isActive: true },
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

    async create(data: { email: string; name: string; role: Role; password?: string }) {
        const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : '';

        return this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                role: data.role,
                password: hashedPassword,
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

                // Identify by EID (Primary) or Email
                const where = u.eid ? { eid: String(u.eid) } : { email: u.email };

                await this.prisma.user.upsert({
                    where,
                    update: {
                        name: u.name,
                        role: role,
                        billable: billable,
                        employeeTeam: u.employeeTeam,
                        projectCode: u.projectCode,
                        supervisor: u.supervisor,
                        manager: u.manager,
                        sdm: u.sdm,
                        systemId: u.systemId,
                        isActive: true, // Mark as active if they are in the latest file
                        ...(u.eid && u.email ? { email: u.email } : {})
                    },
                    create: {
                        ...u,
                        password: u.password ? await bcrypt.hash(u.password, 10) : await bcrypt.hash('Standard123!', 10),
                        role,
                        billable,
                        isActive: true,
                        email: u.email || (u.eid ? `${u.eid}@flatworld.ph` : `user-${Math.random().toString(36).substring(7)}@placeholder.com`)
                    }
                });
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
