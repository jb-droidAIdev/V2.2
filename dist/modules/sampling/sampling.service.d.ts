import { PrismaService } from '../../prisma.service';
export declare class SamplingService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    runSampling(batchId: string, campaignId: string): Promise<{
        runId: string;
        sampledCount: number;
    }>;
    private groupTickets;
    private shuffle;
}
