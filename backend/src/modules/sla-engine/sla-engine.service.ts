import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SlaEngineService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calculate due date based on EST business days.
     * "Business Days" = Mon–Fri in EST.
     */
    async calculateDueDate(startDate: Date, businessDaysToAdd: number, campaignId?: string): Promise<Date> {
        const holidays = await this.getHolidays(campaignId);
        let currentDate = new Date(startDate);
        let daysAdded = 0;

        while (daysAdded < businessDaysToAdd) {
            // Add 24 hours
            currentDate.setTime(currentDate.getTime() + 24 * 60 * 60 * 1000);

            if (this.isBusinessDay(currentDate, holidays)) {
                daysAdded++;
            }
        }

        return currentDate;
    }

    /**
     * Check if date is a business day in EST
     */
    private isBusinessDay(date: Date, holidays: Set<string>): boolean {
        // Convert to EST time to check the day of week
        // We use Intl.DateTimeFormat to get the day in 'America/New_York'
        const estDateString = date.toLocaleDateString("en-US", { timeZone: "America/New_York" });
        const estDate = new Date(estDateString);
        const dayOfWeek = estDate.getDay(); // 0-6 in local time of the parsed string (which represents EST day)

        // Saturday (6) or Sunday (0)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false;
        }

        // Check holidays (YYYY-MM-DD match)
        // We compare against the EST date string "MM/DD/YYYY" or similar, normalized
        // best to normalize holidays to YYYY-MM-DD and convert estDate to same
        const year = estDate.getFullYear();
        const month = String(estDate.getMonth() + 1).padStart(2, '0');
        const day = String(estDate.getDate()).padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;

        if (holidays.has(isoDate)) {
            return false;
        }

        return true;
    }

    private async getHolidays(campaignId?: string): Promise<Set<string>> {
        // Placeholder: Fetch from DB or Config
        // Phase 1: Return empty set or standard holidays
        return new Set<string>();
    }
}
