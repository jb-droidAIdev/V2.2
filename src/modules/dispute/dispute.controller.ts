import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('disputes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  // File a new dispute — requires DISPUTE_CREATE
  @Permissions(Permission.DISPUTE_CREATE)
  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.disputeService.createDispute(body.auditId, req.user.id, body);
  }

  // QA issues accept/reject verdict — requires DISPUTE_RESOLVE
  @Permissions(Permission.DISPUTE_RESOLVE)
  @Patch(':id/qa-verdict')
  qaVerdict(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.disputeService.qaVerdict(id, req.user.id, body.itemId, {
      verdict: body.verdict,
      comment: body.comment,
    });
  }

  // Supervisor re-appeals a rejected verdict — requires DISPUTE_REAPPEAL
  @Permissions(Permission.DISPUTE_REAPPEAL)
  @Post(':id/reappeal')
  reappeal(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.disputeService.reappeal(id, req.user.id, body);
  }

  // QA TL issues the final binding verdict — requires DISPUTE_FINAL_VERDICT
  @Permissions(Permission.DISPUTE_FINAL_VERDICT)
  @Patch(':id/final-verdict')
  finalVerdict(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.disputeService.finalVerdict(id, req.user.id, body.itemId, {
      verdict: body.verdict,
      comment: body.comment,
    });
  }

  // List all disputes — any authenticated user (service scopes results)
  @Get()
  findAll() {
    return this.disputeService.findAll();
  }

  // Disputes for a specific audit — any authenticated user
  @Get('audit/:auditId')
  findByAudit(@Param('auditId') auditId: string) {
    return this.disputeService.findByAudit(auditId);
  }
}
