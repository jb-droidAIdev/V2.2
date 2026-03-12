import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CoachingLogService } from './coaching-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';
import { CreateCoachingLogDto } from './dto/coaching-log.dto';

@Controller('audits/coaching-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CoachingLogController {
  constructor(private readonly coachingLogService: CoachingLogService) {}

  @Permissions(Permission.AUDIT_COACH, Permission.COACHING_LOG_READ)
  @Get(':auditId')
  findByAuditId(@Param('auditId') auditId: string) {
    return this.coachingLogService.findByAuditId(auditId);
  }

  @Permissions(Permission.AUDIT_COACH)
  @Post()
  upsert(@Request() req: any, @Body() data: CreateCoachingLogDto) {
    return this.coachingLogService.upsert(req.user.id, data);
  }

  @Permissions(Permission.AUDIT_COACH)
  @Post(':id/release')
  release(@Param('id') id: string) {
    return this.coachingLogService.release(id);
  }

  @Patch(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Body('commitment') commitment: string) {
    return this.coachingLogService.acknowledge(id, commitment);
  }
}
