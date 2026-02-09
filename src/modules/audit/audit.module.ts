import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { QaController } from './qa.controller';

@Module({
    controllers: [AuditController, QaController],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule { }
