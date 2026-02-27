import {
  Controller,
  Get,
  UseGuards,
  Param,
  Req,
  Post,
  Body,
  Delete,
  Patch,
  NotFoundException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
  async updateRoleConfig(
    @Param('id') id: string,
    @Body()
    body: { permissions?: string[]; name?: string; description?: string },
  ) {
    if (body.permissions) {
      return this.usersService.updateRolePermissions(id, body.permissions);
    }
    return this.usersService.updateRole(id, {
      name: body.name,
      description: body.description,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Permissions(Permission.USER_MANAGE)
  @Post('config/roles')
  async createRole(@Body() body: { name: string; description?: string }) {
    if (!body.name) throw new BadRequestException('Role name is required');
    return this.usersService.createRole(body.name, body.description);
  }

  @UseGuards(AuthGuard('jwt'))
  @Permissions(Permission.USER_MANAGE)
  @Delete('config/roles/:id')
  async deleteRole(@Param('id') id: string) {
    return this.usersService.deleteRole(id);
  }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.usersService.findAll(req.user, { limit, offset });
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

  // Dedicated endpoint for moving users to a team folder - requires CAMPAIGN_MANAGE only
  @UseGuards(AuthGuard('jwt'))
  @Permissions(Permission.CAMPAIGN_MANAGE)
  @Post('assign-team')
  async assignToTeam(@Body() body: { userIds: string[]; teamName: string }) {
    return this.usersService.assignUsersToTeam(body.userIds, body.teamName);
  }

  // Dedicated endpoint for removing users from a team - requires CAMPAIGN_MANAGE only
  @UseGuards(AuthGuard('jwt'))
  @Permissions(Permission.CAMPAIGN_MANAGE)
  @Post('remove-from-team')
  async removeFromTeam(@Body() body: { userId: string }) {
    return this.usersService.assignUsersToTeam([body.userId], 'Unassigned');
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
  @Permissions(Permission.USER_MANAGE, Permission.CAMPAIGN_MANAGE)
  @Patch('teams/rename')
  async renameTeam(@Body() body: { oldName: string; newName: string }) {
    return this.usersService.bulkUpdateTeam(body.oldName, body.newName);
  }

  @UseGuards(AuthGuard('jwt'))
  @Permissions(Permission.USER_MANAGE)
  @Post('config/roles/bulk-reset')
  async bulkResetRole(@Body() body: { roleName: string }) {
    return this.usersService.bulkResetRole(body.roleName);
  }

  @UseGuards(AuthGuard('jwt'))
  @Permissions(Permission.USER_MANAGE, Permission.CAMPAIGN_MANAGE)
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
  @Permissions(Permission.USER_MANAGE, Permission.CAMPAIGN_MANAGE)
  @Post(':id/campaigns')
  async updateCampaigns(
    @Param('id') id: string,
    @Body()
    body: {
      campaignIds?: string[];
      assignments?: { campaignId: string; formId?: string | null }[];
    },
  ) {
    // Support both legacy format (campaignIds[]) and new format (assignments[{campaignId, formId}])
    const assignments =
      body.assignments ??
      (body.campaignIds ?? []).map((campaignId) => ({ campaignId }));
    return this.usersService.assignCampaigns(id, assignments);
  }

  @UseGuards(AuthGuard('jwt'))
  @Permissions(Permission.USER_MANAGE)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
