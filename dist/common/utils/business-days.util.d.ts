import { DateTime } from 'luxon';
export declare function isBusinessDay(date: Date | DateTime): boolean;
export declare function addBusinessDays(startDate: Date | DateTime, businessDays: number): DateTime;
export declare function getBusinessDaysBetween(startDate: Date | DateTime, endDate: Date | DateTime): number;
export declare function getBusinessDayDeadline(startDate: Date | DateTime, businessDays: number): DateTime;
export declare function isDeadlinePassed(deadline: Date | DateTime): boolean;
export declare function getRemainingBusinessDays(deadline: Date | DateTime): number;
export declare function getNowEST(): DateTime;
export declare function toEST(date: Date | DateTime): DateTime;
