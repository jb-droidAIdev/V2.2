import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('audits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // Any authenticated user can check their own active audit
  @Get('active')
  getActive(@Request() req: any) {
    return this.auditService.getActiveAudit(req.user.id);
  }

  // Viewing audits — scoped by AUDIT_VIEW_ALL, otherwise returns own/team audits
  @Get()
  findAll(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditService.findAll(req.user, { limit, offset });
  }

  // Fail log — any authenticated user (scoped inside service)
  @Get('failures')
  getFailures(@Request() req: any, @Query() query: any) {
    return this.auditService.getFailures(req.user, query);
  }

  // Start a sampled audit — requires AUDIT_CREATE
  @Permissions(Permission.AUDIT_CREATE)
  @Post('start/:sampledTicketId')
  start(
    @Param('sampledTicketId') sampledTicketId: string,
    @Body('formVersionId') formVersionId: string,
    @Body('campaignId') campaignId: string,
    @Request() req: any,
  ) {
    return this.auditService.startAudit(
      sampledTicketId,
      req.user.id,
      formVersionId,
      campaignId,
    );
  }

  // Create a manual audit — requires AUDIT_CREATE
  @Permissions(Permission.AUDIT_CREATE)
  @Post('manual')
  createManual(@Body() body: any, @Request() req: any) {
    return this.auditService.createManualAudit({
      ...body,
      auditorId: req.user.id,
    });
  }

  // View a single audit — any authenticated user (service enforces ownership)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.auditService.findOne(id, req.user);
  }

  // Autosave in-progress audit — any authenticated auditor
  @Patch(':id/autosave')
  autosave(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.auditService.autosave(id, req.user.id, body);
  }

  // Submit a completed audit — requires AUDIT_CREATE
  @Permissions(Permission.AUDIT_CREATE)
  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.auditService.submit(id, req.user.id, body);
  }

  // Discard an in-progress audit
  @Post(':id/discard')
  discard(@Param('id') id: string, @Request() req: any) {
    return this.auditService.discard(id, req.user.id);
  }

  // Acknowledge an audit result — requires AUDIT_ACKNOWLEDGE
  @Permissions(Permission.AUDIT_ACKNOWLEDGE)
  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Request() req: any) {
    return this.auditService.acknowledgeAudit(id, req.user.id);
  }

  // Delete an audit — requires AUDIT_DELETE
  @Permissions(Permission.AUDIT_DELETE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.auditService.remove(id);
  }
}
