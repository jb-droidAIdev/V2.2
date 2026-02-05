import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { CalibrationService } from './calibration.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('calibration')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CalibrationController {
    constructor(private readonly calibrationService: CalibrationService) { }

    @Roles(Role.ADMIN, Role.QA_TL, Role.QA)
    @Get()
    findAll() {
        return this.calibrationService.findAll();
    }

    @Roles(Role.ADMIN, Role.QA_TL, Role.QA)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.calibrationService.findOne(id);
    }

    @Roles(Role.ADMIN, Role.QA_TL)
    @Post()
    create(@Body() body: { title: string; scheduledAt: string; participantIds: string[] }) {
        return this.calibrationService.create({
            ...body,
            scheduledAt: new Date(body.scheduledAt),
        });
    }

    @Roles(Role.ADMIN, Role.QA_TL)
    @Patch(':id/status')
    updateStatus(@Param('id') id: string, @Body('status') status: string) {
        return this.calibrationService.updateStatus(id, status);
    }

    @Roles(Role.QA, Role.QA_TL, Role.ADMIN)
    @Post(':id/score')
    submitScore(
        @Param('id') sessionId: string,
        @Body() body: { ticketId: string; scoreJson: any },
        @Request() req: any,
    ) {
        return this.calibrationService.submitScore(sessionId, req.user.id, body.ticketId, body.scoreJson);
    }

    @Roles(Role.ADMIN, Role.QA_TL, Role.QA)
    @Get(':id/stats')
    getStats(@Param('id') id: string) {
        return this.calibrationService.getSessionStats(id);
    }
}
