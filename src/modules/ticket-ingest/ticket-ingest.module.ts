import { Module } from '@nestjs/common';
import { TicketIngestService } from './ticket-ingest.service';
import { TicketIngestController } from './ticket-ingest.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [TicketIngestService],
  controllers: [TicketIngestController],
  exports: [TicketIngestService],
})
export class TicketIngestModule {}
