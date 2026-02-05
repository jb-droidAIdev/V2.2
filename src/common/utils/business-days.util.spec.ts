import {
    isBusinessDay,
    addBusinessDays,
    getBusinessDaysBetween,
    getBusinessDayDeadline,
    isDeadlinePassed,
    getRemainingBusinessDays,
    getNowEST,
    toEST
} from './business-days.util';
import { DateTime } from 'luxon';

describe('Business Days Utility', () => {
    describe('isBusinessDay', () => {
        it('should return true for Monday-Friday', () => {
            // Monday, Jan 6, 2025
            const monday = DateTime.fromISO('2025-01-06', { zone: 'America/New_York' });
            expect(isBusinessDay(monday)).toBe(true);

            // Friday, Jan 10, 2025
            const friday = DateTime.fromISO('2025-01-10', { zone: 'America/New_York' });
            expect(isBusinessDay(friday)).toBe(true);
        });

        it('should return false for Saturday-Sunday', () => {
            // Saturday, Jan 11, 2025
            const saturday = DateTime.fromISO('2025-01-11', { zone: 'America/New_York' });
            expect(isBusinessDay(saturday)).toBe(false);

            // Sunday, Jan 12, 2025
            const sunday = DateTime.fromISO('2025-01-12', { zone: 'America/New_York' });
            expect(isBusinessDay(sunday)).toBe(false);
        });
    });

    describe('addBusinessDays', () => {
        it('should add 3 business days correctly (Agent window)', () => {
            // Start: Monday, Jan 6, 2025
            const start = DateTime.fromISO('2025-01-06', { zone: 'America/New_York' });

            // Add 3 business days: Tue, Wed, Thu
            const result = addBusinessDays(start, 3);

            // Should be Thursday, Jan 9, 2025
            expect(result.toISODate()).toBe('2025-01-09');
        });

        it('should skip weekends when adding business days', () => {
            // Start: Friday, Jan 10, 2025
            const start = DateTime.fromISO('2025-01-10', { zone: 'America/New_York' });

            // Add 3 business days: Mon, Tue, Wed (skips Sat/Sun)
            const result = addBusinessDays(start, 3);

            // Should be Wednesday, Jan 15, 2025
            expect(result.toISODate()).toBe('2025-01-15');
        });
    });

    describe('getBusinessDaysBetween', () => {
        it('should count business days correctly', () => {
            // Monday to Friday (same week)
            const start = DateTime.fromISO('2025-01-06', { zone: 'America/New_York' });
            const end = DateTime.fromISO('2025-01-10', { zone: 'America/New_York' });

            // Mon, Tue, Wed, Thu, Fri = 5 business days
            expect(getBusinessDaysBetween(start, end)).toBe(5);
        });

        it('should exclude weekends when counting', () => {
            // Friday to next Monday
            const start = DateTime.fromISO('2025-01-10', { zone: 'America/New_York' });
            const end = DateTime.fromISO('2025-01-13', { zone: 'America/New_York' });

            // Fri, Mon = 2 business days (Sat/Sun excluded)
            expect(getBusinessDaysBetween(start, end)).toBe(2);
        });
    });

    describe('getBusinessDayDeadline', () => {
        it('should return deadline at 5 PM EST', () => {
            const start = DateTime.fromISO('2025-01-06T09:00:00', { zone: 'America/New_York' });
            const deadline = getBusinessDayDeadline(start, 3);

            // Should be Thursday, Jan 9, 2025 at 5 PM EST
            expect(deadline.toISO()).toContain('2025-01-09T17:00:00');
        });
    });

    describe('SLA Scenarios from Requirements', () => {
        it('Agent Acknowledge/Dispute Window: 3 business days', () => {
            // Audit released on Monday 9 AM
            const releaseDate = DateTime.fromISO('2025-01-06T09:00:00', { zone: 'America/New_York' });

            // Deadline: Thursday 5 PM (3 business days)
            const deadline = getBusinessDayDeadline(releaseDate, 3);

            expect(deadline.toISODate()).toBe('2025-01-09');
            expect(deadline.hour).toBe(17); // 5 PM
        });

        it('TL Sign-off: 1 business day (4th business day total)', () => {
            // Audit released on Monday 9 AM
            const releaseDate = DateTime.fromISO('2025-01-06T09:00:00', { zone: 'America/New_York' });

            // Agent window ends: Thursday 5 PM (3 business days)
            // TL deadline: Friday 5 PM (1 more business day)
            const tlDeadline = getBusinessDayDeadline(releaseDate, 4);

            expect(tlDeadline.toISODate()).toBe('2025-01-10'); // Friday
        });

        it('Dispute Resolution: Ops TL 1 business day', () => {
            // Dispute submitted on Wednesday 2 PM
            const disputeDate = DateTime.fromISO('2025-01-08T14:00:00', { zone: 'America/New_York' });

            // Ops TL deadline: Thursday 5 PM
            const deadline = getBusinessDayDeadline(disputeDate, 1);

            expect(deadline.toISODate()).toBe('2025-01-09');
        });
    });
});
