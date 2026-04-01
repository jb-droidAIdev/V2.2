import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { QaController } from './qa.controller';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { SlaEngineModule } from '../sla-engine/sla-engine.module';
import { CoachingLogController } from './coaching-log.controller';
import { CoachingLogService } from './coaching-log.service';

import { AuditImportController } from './audit-import.controller';
import { AuditImportService } from './audit-import.service';

@Module({
  imports: [MailModule, AuthModule, SlaEngineModule],
  controllers: [AuditController, QaController, CoachingLogController, AuditImportController],
  providers: [AuditService, CoachingLogService, AuditImportService],
  exports: [AuditService, CoachingLogService, AuditImportService],
})
export class AuditModule { }
