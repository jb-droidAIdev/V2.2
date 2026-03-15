import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TicketIngestService } from './ticket-ingest.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard } from '../auth/permissions/permissions.guard';
import { Permissions } from '../auth/permissions/permissions.decorator';
import { Permission } from '../auth/permissions/permissions.service';

@Controller('ingest')
@UseGuards(AuthGuard('jwt'), RolesGuard, PermissionsGuard)
export class TicketIngestController {
  constructor(private readonly ingestService: TicketIngestService) {}

  @Post(':campaignId/upload')
  @Permissions(Permission.CAMPAIGN_MANAGE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB Limit
    }),
  )
  async upload(
    @Param('campaignId') campaignId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    const csvContent = file.buffer.toString('utf-8');
    return this.ingestService.ingestCsv(
      campaignId,
      req.user.id,
      file.originalname,
      csvContent,
    );
  }
}
