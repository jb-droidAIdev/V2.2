import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ReleaseService } from './release.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('release')
export class ReleaseController {
    constructor(private readonly releaseService: ReleaseService) { }

    @UseGuards(AuthGuard('jwt'))
    @Get('pending')
    getPending() {
        return this.releaseService.getPendingRelease();
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    release(@Body('auditIds') auditIds: string[], @Request() req: any) {
        return this.releaseService.releaseAudits(auditIds, req.user.id);
    }
}
