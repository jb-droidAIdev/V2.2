import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    getStats(@Query() query: any, @Request() req: any) {
        return this.dashboardService.getStats(query, req.user);
    }

    @Get('filters')
    getFilters(@Request() req: any) {
        return this.dashboardService.getFilterOptions(req.user);
    }
}
