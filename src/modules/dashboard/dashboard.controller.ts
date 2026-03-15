import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Permissions(Permission.PAGE_DASHBOARD)
  getStats(@Query() query: any, @Request() req: any) {
    return this.dashboardService.getStats(query, req.user);
  }

  @Get('filters')
  @Permissions(Permission.PAGE_DASHBOARD)
  getFilters(@Query() query: any, @Request() req: any) {
    return this.dashboardService.getFilterOptions(req.user, query);
  }

  @Get('coaching')
  @Permissions(Permission.PAGE_DASHBOARD)
  getCoachingStats(@Query() query: any, @Request() req: any) {
    return this.dashboardService.getCoachingStats(query, req.user);
  }
}
