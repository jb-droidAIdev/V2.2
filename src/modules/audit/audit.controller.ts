import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Request, ForbiddenException, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audits')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    @UseGuards(AuthGuard('jwt'))
    @Get('active')
    getActive(@Request() req: any) {
        return this.auditService.getActiveAudit(req.user.id);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.auditService.findAll(req.user);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('failures')
    getFailures(@Request() req: any, @Query() query: any) {
        return this.auditService.getFailures(req.user, query);
    }

    @Roles(Role.QA, Role.QA_TL, Role.ADMIN)
    @Post('start/:sampledTicketId')
    start(
        @Param('sampledTicketId') sampledTicketId: string,
        @Body('formVersionId') formVersionId: string,
        @Body('campaignId') campaignId: string,
        @Request() req: any
    ) {
        return this.auditService.startAudit(sampledTicketId, req.user.id, formVersionId, campaignId);
    }

    @Roles(Role.QA, Role.QA_TL, Role.ADMIN)
    @Post('manual')
    createManual(@Body() body: any, @Request() req: any) {
        return this.auditService.createManualAudit({
            ...body,
            auditorId: req.user.id
        });
    }

    @UseGuards(AuthGuard('jwt'))
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.auditService.findOne(id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Patch(':id/autosave')
    autosave(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.auditService.autosave(id, req.user.id, body);
    }

    @UseGuards(AuthGuard('jwt'))
    @Post(':id/submit')
    submit(@Param('id') id: string, @Request() req: any) {
        return this.auditService.submit(id, req.user.id);
    }

    @Roles(Role.ADMIN)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.auditService.remove(id);
    }
}
