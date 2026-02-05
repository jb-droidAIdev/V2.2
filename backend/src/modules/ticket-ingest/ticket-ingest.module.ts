import { Module } from '@nestjs/common';
import { TicketIngestService } from './ticket-ingest.service';
import { TicketIngestController } from './ticket-ingest.controller';

@Module({
    providers: [TicketIngestService],
    controllers: [TicketIngestController],
    exports: [TicketIngestService],
})
export class TicketIngestModule { }
