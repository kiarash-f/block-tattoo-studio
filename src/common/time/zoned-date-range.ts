function parseYmd(date: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error('date must be YYYY-MM-DD');
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function addDaysYmd(date: string, days: number): string {
  const { y, m, d } = parseYmd(date);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function getZonedParts(instant: Date, timeZone: string) {
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
  const pick = (t: string) => parts.find((p) => p.type === t)?.value;

  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    hour: Number(pick('hour')),
    minute: Number(pick('minute')),
    second: Number(pick('second')),
  };
}

/**
 * Returns the UTC instant corresponding to 00:00:00 local time for dateStr in timeZone.
 * Handles DST correctly by computing the next day's midnight separately for end range.
 */
function zonedMidnightToUtc(dateStr: string, timeZone: string): Date {
  const { y, m, d } = parseYmd(dateStr);

  // Start from UTC midnight of the target date
  const utcMidnightMs = Date.UTC(y, m - 1, d, 0, 0, 0);
  const utcMidnight = new Date(utcMidnightMs);

  // What is the local time in the target zone at that UTC instant?
  const z = getZonedParts(utcMidnight, timeZone);

  // Compare the local calendar day at that instant vs target day
  const targetDayMs = Date.UTC(y, m - 1, d);
  const zonedDayMs = Date.UTC(z.year, z.month - 1, z.day);
  const dayDiff = Math.round((zonedDayMs - targetDayMs) / 86400000); // -1/0/+1 typically

  // Minutes from local midnight at that instant
  const localMinutes = z.hour * 60 + z.minute;

  // Total offset minutes from UTC midnight to local midnight
  const offsetMinutes = dayDiff * 1440 + localMinutes;

  // Local midnight = UTC midnight - offset
  return new Date(utcMidnightMs - offsetMinutes * 60000);
}

export function getUtcRangeForZonedDate(
  dateStr: string,
  timeZone: string,
): { startUtc: Date; endUtc: Date } {
  const startUtc = zonedMidnightToUtc(dateStr, timeZone);
  const nextDay = addDaysYmd(dateStr, 1);
  const endUtc = zonedMidnightToUtc(nextDay, timeZone);
  return { startUtc, endUtc };
}
