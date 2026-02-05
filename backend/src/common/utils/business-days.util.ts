import { DateTime } from 'luxon';

/**
 * Business Days Utility
 * 
 * Business Days Rule: Monday to Friday in EST timezone
 * Used for all SLA logic in the QA workflow
 */

const TIMEZONE = 'America/New_York'; // EST/EDT

/**
 * Check if a given date is a business day (Monday-Friday in EST)
 */
export function isBusinessDay(date: Date | DateTime): boolean {
    const dt = date instanceof DateTime ? date : DateTime.fromJSDate(date, { zone: TIMEZONE });
    const dayOfWeek = dt.weekday; // 1 = Monday, 7 = Sunday
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
}

/**
 * Add X business days to a given date
 * @param startDate - Starting date
 * @param businessDays - Number of business days to add
 * @returns Date after adding business days
 */
export function addBusinessDays(startDate: Date | DateTime, businessDays: number): DateTime {
    let current = startDate instanceof DateTime
        ? startDate.setZone(TIMEZONE)
        : DateTime.fromJSDate(startDate, { zone: TIMEZONE });

    let daysAdded = 0;

    while (daysAdded < businessDays) {
        current = current.plus({ days: 1 });
        if (isBusinessDay(current)) {
            daysAdded++;
        }
    }

    return current;
}

/**
 * Calculate the number of business days between two dates
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Number of business days between the dates
 */
export function getBusinessDaysBetween(
    startDate: Date | DateTime,
    endDate: Date | DateTime
): number {
    let start = startDate instanceof DateTime
        ? startDate.setZone(TIMEZONE)
        : DateTime.fromJSDate(startDate, { zone: TIMEZONE });

    let end = endDate instanceof DateTime
        ? endDate.setZone(TIMEZONE)
        : DateTime.fromJSDate(endDate, { zone: TIMEZONE });

    // Ensure start is before end
    if (start > end) {
        [start, end] = [end, start];
    }

    let businessDays = 0;
    let current = start;

    while (current <= end) {
        if (isBusinessDay(current)) {
            businessDays++;
        }
        current = current.plus({ days: 1 });
    }

    return businessDays;
}

/**
 * Get the deadline date (X business days from a start date)
 * Returns the date at end of business day (5 PM EST)
 */
export function getBusinessDayDeadline(
    startDate: Date | DateTime,
    businessDays: number
): DateTime {
    const deadline = addBusinessDays(startDate, businessDays);
    // Set to end of business day (5 PM EST)
    return deadline.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
}

/**
 * Check if current time is past the deadline
 */
export function isDeadlinePassed(deadline: Date | DateTime): boolean {
    const now = DateTime.now().setZone(TIMEZONE);
    const deadlineDt = deadline instanceof DateTime
        ? deadline.setZone(TIMEZONE)
        : DateTime.fromJSDate(deadline, { zone: TIMEZONE });

    return now > deadlineDt;
}

/**
 * Get remaining business days until deadline
 * Returns 0 if deadline has passed
 */
export function getRemainingBusinessDays(deadline: Date | DateTime): number {
    const now = DateTime.now().setZone(TIMEZONE);
    const deadlineDt = deadline instanceof DateTime
        ? deadline.setZone(TIMEZONE)
        : DateTime.fromJSDate(deadline, { zone: TIMEZONE });

    if (now > deadlineDt) {
        return 0;
    }

    return getBusinessDaysBetween(now, deadlineDt);
}

/**
 * Get the current date/time in EST
 */
export function getNowEST(): DateTime {
    return DateTime.now().setZone(TIMEZONE);
}

/**
 * Convert any date to EST timezone
 */
export function toEST(date: Date | DateTime): DateTime {
    return date instanceof DateTime
        ? date.setZone(TIMEZONE)
        : DateTime.fromJSDate(date, { zone: TIMEZONE });
}
