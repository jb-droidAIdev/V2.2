import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('disputes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DisputeController {
    constructor(private readonly disputeService: DisputeService) { }

    @Roles(Role.OPS_TL, Role.QA_TL, Role.ADMIN)
    @Post()
    create(@Body() body: any, @Request() req: any) {
        return this.disputeService.createDispute(body.auditId, req.user.id, body);
    }

    @Roles(Role.QA, Role.QA_TL, Role.ADMIN)
    @Patch(':id/qa-verdict')
    qaVerdict(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.disputeService.qaVerdict(id, req.user.id, body.itemId, {
            verdict: body.verdict,
            comment: body.comment
        });
    }

    @Roles(Role.OPS_TL, Role.QA_TL, Role.ADMIN)
    @Post(':id/reappeal')
    reappeal(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.disputeService.reappeal(id, req.user.id, body);
    }

    @Roles(Role.ADMIN)
    @Patch(':id/final-verdict')
    finalVerdict(@Param('id') id: string, @Body() body: any, @Request() req: any) {
        return this.disputeService.finalVerdict(id, req.user.id, body.itemId, {
            verdict: body.verdict,
            comment: body.comment
        });
    }

    @UseGuards(AuthGuard('jwt'))
    @Get()
    findAll() {
        return this.disputeService.findAll();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('audit/:auditId')
    findByAudit(@Param('auditId') auditId: string) {
        return this.disputeService.findByAudit(auditId);
    }
}
