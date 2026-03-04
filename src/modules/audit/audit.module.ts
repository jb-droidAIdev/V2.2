import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { QaController } from './qa.controller';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { CoachingLogController } from './coaching-log.controller';
import { CoachingLogService } from './coaching-log.service';

@Module({
  imports: [MailModule, AuthModule],
  controllers: [AuditController, QaController, CoachingLogController],
  providers: [AuditService, CoachingLogService],
  exports: [AuditService, CoachingLogService],
})
export class AuditModule {}
