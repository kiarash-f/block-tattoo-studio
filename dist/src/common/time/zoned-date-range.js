"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUtcRangeForZonedDate = getUtcRangeForZonedDate;
function parseYmd(date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!m)
        throw new Error('date must be YYYY-MM-DD');
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}
function addDaysYmd(date, days) {
    const { y, m, d } = parseYmd(date);
    const base = new Date(Date.UTC(y, m - 1, d));
    base.setUTCDate(base.getUTCDate() + days);
    const yy = base.getUTCFullYear();
    const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(base.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}
function getZonedParts(instant, timeZone) {
    const dtf = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const parts = dtf.formatToParts(instant);
    const pick = (t) => parts.find((p) => p.type === t)?.value;
    return {
        year: Number(pick('year')),
        month: Number(pick('month')),
        day: Number(pick('day')),
        hour: Number(pick('hour')),
        minute: Number(pick('minute')),
        second: Number(pick('second')),
    };
}
function zonedMidnightToUtc(dateStr, timeZone) {
    const { y, m, d } = parseYmd(dateStr);
    const utcMidnightMs = Date.UTC(y, m - 1, d, 0, 0, 0);
    const utcMidnight = new Date(utcMidnightMs);
    const z = getZonedParts(utcMidnight, timeZone);
    const targetDayMs = Date.UTC(y, m - 1, d);
    const zonedDayMs = Date.UTC(z.year, z.month - 1, z.day);
    const dayDiff = Math.round((zonedDayMs - targetDayMs) / 86400000);
    const localMinutes = z.hour * 60 + z.minute;
    const offsetMinutes = dayDiff * 1440 + localMinutes;
    return new Date(utcMidnightMs - offsetMinutes * 60000);
}
function getUtcRangeForZonedDate(dateStr, timeZone) {
    const startUtc = zonedMidnightToUtc(dateStr, timeZone);
    const nextDay = addDaysYmd(dateStr, 1);
    const endUtc = zonedMidnightToUtc(nextDay, timeZone);
    return { startUtc, endUtc };
}
//# sourceMappingURL=zoned-date-range.js.map