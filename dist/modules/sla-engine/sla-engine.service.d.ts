import { PrismaService } from '../../prisma.service';
export declare class SlaEngineService {
    private prisma;
    constructor(prisma: PrismaService);
    calculateDueDate(startDate: Date, businessDaysToAdd: number, campaignId?: string): Promise<Date>;
    private isBusinessDay;
    private getHolidays;
}
