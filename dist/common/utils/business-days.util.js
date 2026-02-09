"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBusinessDay = isBusinessDay;
exports.addBusinessDays = addBusinessDays;
exports.getBusinessDaysBetween = getBusinessDaysBetween;
exports.getBusinessDayDeadline = getBusinessDayDeadline;
exports.isDeadlinePassed = isDeadlinePassed;
exports.getRemainingBusinessDays = getRemainingBusinessDays;
exports.getNowEST = getNowEST;
exports.toEST = toEST;
const luxon_1 = require("luxon");
const TIMEZONE = 'America/New_York';
function isBusinessDay(date) {
    const dt = date instanceof luxon_1.DateTime ? date : luxon_1.DateTime.fromJSDate(date, { zone: TIMEZONE });
    const dayOfWeek = dt.weekday;
    return dayOfWeek >= 1 && dayOfWeek <= 5;
}
function addBusinessDays(startDate, businessDays) {
    let current = startDate instanceof luxon_1.DateTime
        ? startDate.setZone(TIMEZONE)
        : luxon_1.DateTime.fromJSDate(startDate, { zone: TIMEZONE });
    let daysAdded = 0;
    while (daysAdded < businessDays) {
        current = current.plus({ days: 1 });
        if (isBusinessDay(current)) {
            daysAdded++;
        }
    }
    return current;
}
function getBusinessDaysBetween(startDate, endDate) {
    let start = startDate instanceof luxon_1.DateTime
        ? startDate.setZone(TIMEZONE)
        : luxon_1.DateTime.fromJSDate(startDate, { zone: TIMEZONE });
    let end = endDate instanceof luxon_1.DateTime
        ? endDate.setZone(TIMEZONE)
        : luxon_1.DateTime.fromJSDate(endDate, { zone: TIMEZONE });
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
function getBusinessDayDeadline(startDate, businessDays) {
    const deadline = addBusinessDays(startDate, businessDays);
    return deadline.set({ hour: 17, minute: 0, second: 0, millisecond: 0 });
}
function isDeadlinePassed(deadline) {
    const now = luxon_1.DateTime.now().setZone(TIMEZONE);
    const deadlineDt = deadline instanceof luxon_1.DateTime
        ? deadline.setZone(TIMEZONE)
        : luxon_1.DateTime.fromJSDate(deadline, { zone: TIMEZONE });
    return now > deadlineDt;
}
function getRemainingBusinessDays(deadline) {
    const now = luxon_1.DateTime.now().setZone(TIMEZONE);
    const deadlineDt = deadline instanceof luxon_1.DateTime
        ? deadline.setZone(TIMEZONE)
        : luxon_1.DateTime.fromJSDate(deadline, { zone: TIMEZONE });
    if (now > deadlineDt) {
        return 0;
    }
    return getBusinessDaysBetween(now, deadlineDt);
}
function getNowEST() {
    return luxon_1.DateTime.now().setZone(TIMEZONE);
}
function toEST(date) {
    return date instanceof luxon_1.DateTime
        ? date.setZone(TIMEZONE)
        : luxon_1.DateTime.fromJSDate(date, { zone: TIMEZONE });
}
//# sourceMappingURL=business-days.util.js.map