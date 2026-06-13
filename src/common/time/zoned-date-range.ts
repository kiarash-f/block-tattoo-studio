function parseYmd(date: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error('date must be YYYY-MM-DD');
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function ymdToString(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addDays(date: string, days: number): string {
  const { y, m, d } = parseYmd(date);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return ymdToString(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
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

function zonedMidnightToUtc(dateStr: string, timeZone: string): Date {
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

/** Returns the Monday of the ISO week containing dateStr (YYYY-MM-DD). */
function getMondayOf(dateStr: string): string {
  const { y, m, d } = parseYmd(dateStr);
  const base = new Date(Date.UTC(y, m - 1, d));
  const dow = base.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const daysToMonday = dow === 0 ? -6 : 1 - dow;
  base.setUTCDate(base.getUTCDate() + daysToMonday);
  return ymdToString(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
}

export type Period = 'day' | 'week' | 'month' | 'year';

/**
 * Returns the UTC start/end range for the given period containing dateStr,
 * in the given timezone.
 */
export function getUtcRangeForPeriod(
  dateStr: string,
  period: Period,
  timeZone: string,
): { startUtc: Date; endUtc: Date; startDate: string; endDate: string } {
  const { y, m } = parseYmd(dateStr);

  let startDate: string;
  let endDate: string; // exclusive (first day of next period)

  switch (period) {
    case 'day':
      startDate = dateStr;
      endDate = addDays(dateStr, 1);
      break;

    case 'week': {
      startDate = getMondayOf(dateStr);
      endDate = addDays(startDate, 7);
      break;
    }

    case 'month': {
      startDate = ymdToString(y, m, 1);
      // First day of next month
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;
      endDate = ymdToString(nextYear, nextMonth, 1);
      break;
    }

    case 'year':
      startDate = ymdToString(y, 1, 1);
      endDate = ymdToString(y + 1, 1, 1);
      break;
  }

  return {
    startUtc: zonedMidnightToUtc(startDate, timeZone),
    endUtc: zonedMidnightToUtc(endDate, timeZone),
    startDate,
    endDate,
  };
}

// Keep the old export so nothing else breaks
export function getUtcRangeForZonedDate(
  dateStr: string,
  timeZone: string,
): { startUtc: Date; endUtc: Date } {
  const { startUtc, endUtc } = getUtcRangeForPeriod(dateStr, 'day', timeZone);
  return { startUtc, endUtc };
}
