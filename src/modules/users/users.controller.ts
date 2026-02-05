import { Controller, Get, UseGuards, Param, Req, Post, Body, Delete, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
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

    @UseGuards(JwtAuthGuard)
    @Post('bulk')
    async bulkCreate(@Body() users: any[]) {
        return this.usersService.bulkCreate(users);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('teams/rename')
    async renameTeam(@Body() body: { oldName: string; newName: string }) {
        return this.usersService.bulkUpdateTeam(body.oldName, body.newName);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.usersService.updateUser(id, data);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id/campaigns')
    async getCampaigns(@Param('id') id: string) {
        return this.usersService.getAssignedCampaigns(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/campaigns')
    async updateCampaigns(@Param('id') id: string, @Body() body: { campaignIds: string[] }) {
        return this.usersService.assignCampaigns(id, body.campaignIds);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
