import { Module } from '@nestjs/common';
import { ReleaseService } from './release.service';
import { ReleaseController } from './release.controller';
import { SlaEngineModule } from '../sla-engine/sla-engine.module';

@Module({
    imports: [SlaEngineModule],
    providers: [ReleaseService],
    controllers: [ReleaseController],
    exports: [ReleaseService],
})
export class ReleaseModule { }
