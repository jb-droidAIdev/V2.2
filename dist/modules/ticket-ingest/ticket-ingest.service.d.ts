import { PrismaService } from '../../prisma.service';
export declare class TicketIngestService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    ingestCsv(campaignId: string, userId: string, filename: string, csvContent: string): Promise<unknown>;
}
