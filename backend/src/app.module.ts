import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { FormsModule } from './modules/forms/forms.module';
import { TicketIngestModule } from './modules/ticket-ingest/ticket-ingest.module';
import { SamplingModule } from './modules/sampling/sampling.module';
import { AuditModule } from './modules/audit/audit.module';
import { SlaEngineModule } from './modules/sla-engine/sla-engine.module';
import { ReleaseModule } from './modules/release/release.module';
import { DisputeModule } from './modules/dispute/dispute.module';
import { CalibrationModule } from './modules/calibration/calibration.module';
import { RubricRevisionModule } from './modules/rubric-revision/rubric-revision.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MailModule } from './modules/mail/mail.module';

import { GlobalModule } from './global.module';
import { UsersModule } from './modules/users/users.module';

import { DashboardModule } from './modules/dashboard/dashboard.module';
@Module({
  imports: [GlobalModule, AuthModule, CampaignsModule, FormsModule, TicketIngestModule, SamplingModule, AuditModule, SlaEngineModule, ReleaseModule, DisputeModule, CalibrationModule, RubricRevisionModule, NotificationsModule, MailModule, UsersModule, DashboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
