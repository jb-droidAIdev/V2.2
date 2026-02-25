import { Module } from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { DisputeController } from './dispute.controller';
import { AuditModule } from '../audit/audit.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [AuditModule, MailModule],
  providers: [DisputeService],
  controllers: [DisputeController],
  exports: [DisputeService],
})
export class DisputeModule {}
