import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('qa')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class QaController {
  constructor(private readonly auditService: AuditService) {}

  @Get('queue')
  @Permissions(Permission.AUDIT_CREATE)
  async getQueue(@Request() req: any) {
    return this.auditService.getQueue(req.user.id);
  }
}
