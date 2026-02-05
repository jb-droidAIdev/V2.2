import { Controller, Get, UseGuards, Param, Req, Post, Body, Delete, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    async findAll() {
        return this.usersService.findAll();
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
    @Post('bulk')
    async bulkCreate(@Body() users: any[]) {
        return this.usersService.bulkCreate(users);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('teams/rename')
    async renameTeam(@Body() body: { oldName: string; newName: string }) {
        return this.usersService.bulkUpdateTeam(body.oldName, body.newName);
    }

    @UseGuards(AuthGuard('jwt'))
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
    @Post(':id/campaigns')
    async updateCampaigns(@Param('id') id: string, @Body() body: { campaignIds: string[] }) {
        return this.usersService.assignCampaigns(id, body.campaignIds);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
