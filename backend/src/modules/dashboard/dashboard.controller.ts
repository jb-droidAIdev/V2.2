import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    async getStats(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('agentName') agentName: string,
        @Query('agentId') agentId: string | string[],
        @Query('ticketId') ticketId: string,
        @Query('campaignId') campaignId: string | string[],
        @Query('supervisor') supervisor: string | string[],
        @Query('sdm') sdm: string | string[],
        @Query('auditorId') auditorId: string | string[],
        @Query('granularity') granularity: 'day' | 'week' | 'month',
        @Req() req: any
    ) {
        return this.dashboardService.getStats({
            startDate,
            endDate,
            agentName,
            agentId,
            ticketId,
            campaignId,
            supervisor,
            sdm,
            auditorId,
            granularity
        }, req.user);
    }

    @Get('filters')
    async getFilters() {
        return this.dashboardService.getFilterOptions();
    }
}
