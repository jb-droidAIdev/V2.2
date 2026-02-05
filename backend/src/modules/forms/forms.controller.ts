import { Controller, Get, Post, Body, Param, Patch, UseGuards, Delete, Req, Query } from '@nestjs/common';
import { FormsService } from './forms.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('forms')
export class FormsController {
    constructor(private readonly formsService: FormsService) { }

    @UseGuards(AuthGuard('jwt'))
    @Get()
    findAll() {
        return this.formsService.findAll();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('drafts')
    getDrafts() {
        return this.formsService.getDrafts();
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    create(@Body() body: any) {
        return this.formsService.create(body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('available')
    findAvailable(@Query('campaignId') campaignId?: string, @Query('teamName') teamName?: string) {
        return this.formsService.findByCampaignOrTeam(campaignId, teamName);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id/versions')
    getVersions(@Param('id') id: string) {
        return this.formsService.getVersions(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/versions')
    createVersion(@Param('id') id: string, @Body() body: any, @Req() req: any) {
        return this.formsService.createVersion(id, body, req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch('versions/:vid/publish')
    publishVersion(@Param('vid') vid: string) {
        return this.formsService.publishVersion(vid);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/archive')
    archive(@Param('id') id: string) {
        return this.formsService.archive(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.formsService.findOne(id);
    }

    @Get('campaign/:campaignId/active')
    findActiveByCampaign(@Param('campaignId') campaignId: string) {
        return this.formsService.findActiveByCampaign(campaignId);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.formsService.update(id, body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.formsService.remove(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/duplicate')
    duplicate(@Param('id') id: string, @Body() body: any, @Req() req: any) {
        return this.formsService.duplicate(id, body, req.user.id);
    }
}
