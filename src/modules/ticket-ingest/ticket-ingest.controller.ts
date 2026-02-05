import { Controller, Post, Body, Param, UseGuards, Request, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketIngestService } from './ticket-ingest.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('ingest')
export class TicketIngestController {
    constructor(private readonly ingestService: TicketIngestService) { }

    @UseGuards(AuthGuard('jwt'))
    @Post(':campaignId/upload')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 50 * 1024 * 1024 } // 50MB Limit
    }))
    async upload(
        @Param('campaignId') campaignId: string,
        @UploadedFile() file: Express.Multer.File,
        @Request() req: any
    ) {
        const csvContent = file.buffer.toString('utf-8');
        return this.ingestService.ingestCsv(campaignId, req.user.id, file.originalname, csvContent);
    }
}
