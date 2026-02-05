import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('qa')
export class QaController {
    constructor(private readonly auditService: AuditService) { }

    @UseGuards(AuthGuard('jwt'))
    @Get('queue')
    async getQueue(@Request() req: any) {
        return this.auditService.getQueue(req.user.id);
    }
}
