import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditImportService } from './audit-import.service';
import { RolesGuard } from '../auth/roles.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('audits/import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditImportController {
  constructor(private importService: AuditImportService) {}

  @Post('legacy')
  @Permissions(Permission.AUDIT_IMPORT_LEGACY)
  async importLegacy(@Body() data: any[]) {
    return this.importService.importLegacyAudits(data);
  }
}
