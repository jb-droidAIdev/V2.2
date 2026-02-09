import { TicketIngestService } from './ticket-ingest.service';
export declare class TicketIngestController {
    private readonly ingestService;
    constructor(ingestService: TicketIngestService);
    upload(campaignId: string, file: Express.Multer.File, req: any): Promise<unknown>;
}
