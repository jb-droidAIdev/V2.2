import { PrismaService } from '../../prisma.service';
export declare class AiAnalysisService {
    private prisma;
    private readonly logger;
    private genAI;
    private model;
    constructor(prisma: PrismaService);
    private getDBContext;
    analyze(prompt: string, filters?: any): Promise<{
        insight: any;
        sql: any;
        data: any[];
        count: number;
    }>;
}
