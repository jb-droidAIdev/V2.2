import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReleaseService } from './release.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('release')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class ReleaseController {
  constructor(private readonly releaseService: ReleaseService) {}

  @Get('pending')
  @Permissions(Permission.CAMPAIGN_MANAGE)
  getPending() {
    return this.releaseService.getPendingRelease();
  }

  @Post()
  @Permissions(Permission.CAMPAIGN_MANAGE)
  release(@Body('auditIds') auditIds: string[], @Request() req: any) {
    return this.releaseService.releaseAudits(auditIds, req.user.id);
  }
}
