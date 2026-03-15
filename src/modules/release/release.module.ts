import { Module } from '@nestjs/common';
import { ReleaseService } from './release.service';
import { ReleaseController } from './release.controller';
import { SlaEngineModule } from '../sla-engine/sla-engine.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SlaEngineModule, AuthModule],
  providers: [ReleaseService],
  controllers: [ReleaseController],
  exports: [ReleaseService],
})
export class ReleaseModule {}
