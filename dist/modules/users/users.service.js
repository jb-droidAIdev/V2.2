"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const client_1 = require("@prisma/client");
const bcrypt = require("bcrypt");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findOne(identifier) {
        if (!identifier)
            return null;
        return this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: identifier.toLowerCase().trim(), mode: 'insensitive' } },
                    { eid: identifier.trim() }
                ]
            },
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
    }
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
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
    }
    async findAll(user) {
        let where = { isActive: true };
        if (user && [client_1.Role.QA, client_1.Role.QA_TL, client_1.Role.QA_MANAGER, client_1.Role.OPS_TL, client_1.Role.OPS_MANAGER, client_1.Role.SDM].includes(user.role)) {
            const assignments = await this.prisma.campaignQA.findMany({
                where: { userId: user.id },
                include: { campaign: true }
            });
            const campaignNames = assignments.map(a => a.campaign.name);
            where.OR = [
                { employeeTeam: user.employeeTeam },
                { employeeTeam: { in: campaignNames } },
                { role: { in: [client_1.Role.QA, client_1.Role.QA_TL] } }
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
    async findByTeam(teamName, requestingUserId) {
        return this.prisma.user.findMany({
            where: {
                employeeTeam: teamName,
                role: client_1.Role.AGENT,
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
    async create(data) {
        const { password, ...userData } = data;
        const hashedPassword = await bcrypt.hash(password || 'Standard123!', 10);
        const targetRole = userData.role || 'AGENT';
        const userRole = await this.prisma.userRole.findUnique({ where: { name: targetRole } });
        const sanitizedData = Object.entries(userData).reduce((acc, [key, value]) => {
            if (typeof value === 'string') {
                acc[key] = value.trim();
            }
            else {
                acc[key] = value;
            }
            return acc;
        }, {});
        return this.prisma.user.create({
            data: {
                ...sanitizedData,
                password: hashedPassword,
                mustChangePassword: true,
                roleId: userRole?.id
            }
        });
    }
    async bulkCreate(users) {
        const chunkSize = 100;
        let processedCount = 0;
        const activeEids = users.filter(u => u.eid).map(u => String(u.eid));
        const activeEmails = users.filter(u => !u.eid && u.email).map(u => u.email);
        const allRoles = await this.prisma.userRole.findMany();
        const roleMap = new Map(allRoles.map(r => [r.name, r.id]));
        for (let i = 0; i < users.length; i += chunkSize) {
            const userChunk = users.slice(i, i + chunkSize);
            await Promise.all(userChunk.map(async (u) => {
                const role = u.role || client_1.Role.AGENT;
                const billable = u.billable === true || u.billable === 'true' || u.billable === 'Yes';
                const roleId = roleMap.get(role);
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
                    await this.prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            ...userData,
                            ...(u.email ? { email: u.email.toLowerCase().trim() } : {}),
                            ...(u.eid ? { eid: String(u.eid).trim() } : {}),
                            roleId: roleId,
                            role: role
                        }
                    });
                }
                else {
                    const defaultPassword = await bcrypt.hash('Standard123!', 10);
                    await this.prisma.user.create({
                        data: {
                            ...userData,
                            email: u.email ? u.email.toLowerCase().trim() : (u.eid ? `${u.eid.trim()}@flatworld.ph` : `user-${Math.random().toString(36).substring(7)}@placeholder.com`),
                            eid: u.eid ? String(u.eid).trim() : null,
                            password: defaultPassword,
                            mustChangePassword: true,
                            roleId: roleId
                        }
                    });
                }
                processedCount++;
            }));
        }
        await this.prisma.user.updateMany({
            where: {
                role: client_1.Role.AGENT,
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
    async updateLoginMetadata(id, data) {
        return this.prisma.user.update({
            where: { id },
            data
        });
    }
    async updatePassword(id, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return this.prisma.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });
    }
    async remove(id) {
        return this.prisma.user.delete({
            where: { id }
        });
    }
    async bulkUpdateTeam(oldTeamName, newTeamName) {
        return this.prisma.user.updateMany({
            where: { employeeTeam: oldTeamName },
            data: { employeeTeam: newTeamName }
        });
    }
    async updateUser(id, data) {
        let updateData = { ...data };
        if (data.role) {
            const userRole = await this.prisma.userRole.findUnique({ where: { name: data.role } });
            if (userRole) {
                updateData.roleId = userRole.id;
            }
        }
        return this.prisma.user.update({
            where: { id },
            data: updateData
        });
    }
    async findAllRoles() {
        return this.prisma.userRole.findMany({
            include: {
                permissions: {
                    include: { permission: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }
    async updateRolePermissions(roleId, permissionCodes) {
        const permissions = await this.prisma.permission.findMany({
            where: { code: { in: permissionCodes } }
        });
        await this.prisma.rolePermission.deleteMany({
            where: { roleId }
        });
        if (permissions.length > 0) {
            await this.prisma.rolePermission.createMany({
                data: permissions.map(p => ({
                    roleId,
                    permissionId: p.id
                }))
            });
        }
        return this.findAllRoles();
    }
    async getAllPermissions() {
        return this.prisma.permission.findMany({
            orderBy: { module: 'asc' }
        });
    }
    async getAssignedCampaigns(userId) {
        const assignments = await this.prisma.campaignQA.findMany({
            where: { userId },
            include: { campaign: true }
        });
        return assignments.map(a => a.campaign);
    }
    async assignCampaigns(userId, campaignIds) {
        return this.prisma.$transaction(async (tx) => {
            await tx.campaignQA.deleteMany({
                where: { userId }
            });
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map