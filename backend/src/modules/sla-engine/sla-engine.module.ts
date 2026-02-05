import { Module } from '@nestjs/common';
import { SlaEngineService } from './sla-engine.service';
import { PrismaService } from '../../prisma.service';

@Module({
    providers: [SlaEngineService],
    exports: [SlaEngineService],
})
export class SlaEngineModule { }
