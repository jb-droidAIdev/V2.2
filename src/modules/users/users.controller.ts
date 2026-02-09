import { Controller, Get, UseGuards, Param, Req, Post, Body, Delete, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';


@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @UseGuards(AuthGuard('jwt'))
    @Permissions(Permission.USER_MANAGE)
    @Get('config/roles')
    async getRoles() {
        return this.usersService.findAllRoles();
    }

    @UseGuards(AuthGuard('jwt'))
    @Permissions(Permission.USER_MANAGE)
    @Get('config/permissions')
    async getPermissions() {
        return this.usersService.getAllPermissions();
    }

    @UseGuards(AuthGuard('jwt'))
    @Permissions(Permission.USER_MANAGE)
    @Patch('config/roles/:id')
    async updateRolePermissions(@Param('id') id: string, @Body() body: { permissions: string[] }) {
        return this.usersService.updateRolePermissions(id, body.permissions);
    }

    @Get()
    async findAll(@Req() req: any) {
        return this.usersService.findAll(req.user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Permissions(Permission.USER_MANAGE)
    @Post()
    async create(@Body() data: any) {
        return this.usersService.create(data);
    }

    @Get('teams/dossier')
    async getUniqueTeams() {
        return this.usersService.getUniqueTeams();
    }

    @Get('team/:teamName')
    async findByTeam(@Param('teamName') teamName: string, @Req() req: any) {
        return this.usersService.findByTeam(teamName, req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Permissions(Permission.USER_MANAGE)
    @Post('bulk')
    async bulkCreate(@Body() users: any[]) {
        return this.usersService.bulkCreate(users);
    }

    @UseGuards(AuthGuard('jwt'))
    @Permissions(Permission.USER_MANAGE)
    @Patch('teams/rename')
    async renameTeam(@Body() body: { oldName: string; newName: string }) {
        return this.usersService.bulkUpdateTeam(body.oldName, body.newName);
    }

    @UseGuards(AuthGuard('jwt'))
    @Permissions(Permission.USER_MANAGE)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.usersService.updateUser(id, data);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id/campaigns')
    async getCampaigns(@Param('id') id: string) {
        return this.usersService.getAssignedCampaigns(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Permissions(Permission.USER_MANAGE)
    @Post(':id/campaigns')
    async updateCampaigns(@Param('id') id: string, @Body() body: { campaignIds: string[] }) {
        return this.usersService.assignCampaigns(id, body.campaignIds);
    }

    @UseGuards(AuthGuard('jwt'))
    @Permissions(Permission.USER_MANAGE)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }

}
