import { Module } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { PrismaService } from '../../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [CampaignsController],
    providers: [CampaignsService, PrismaService],
    exports: [CampaignsService],
})
export class CampaignsModule { }
