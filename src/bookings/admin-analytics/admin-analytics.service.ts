import { BadRequestException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyticsRangeQueryDto,
  AnalyticsTimeseriesQueryDto,
  AnalyticsUtmQueryDto,
} from './dto/analytics-range-query.dto';

type BookingStatusString = string;
type CancelReasonString = string;

type MinimalRow = {
  createdAt: Date;
  status: BookingStatusString;
  cancelReason: CancelReasonString | null;
  approvedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  source: string;
  bookingType: string;
  utmCampaign: string | null;
  utmAdset: string | null;
  utmAd: string | null;
};

type UtcRange = { startUtc: Date; endUtc: Date };

type TimeseriesBucket = {
  key: string;
  label: string;
  startUtc: Date;
  endUtc: Date;
  total: number;
  approved: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private tzOrDefault(tz?: string) {
    return tz?.trim() ? tz.trim() : 'Europe/Berlin';
  }

  /**
   * Range for a local date in a specific timezone:
   * [local day start, next local day start) converted to UTC.
   * DST-safe.
   */
  private getUtcRangeForZonedDate(date: string, timezone: string): UtcRange {
    const startLocal = DateTime.fromISO(date, { zone: timezone }).startOf(
      'day',
    );
    if (!startLocal.isValid) {
      throw new BadRequestException(
        `Invalid date or timezone: date=${date}, timezone=${timezone}`,
      );
    }

    const endLocal = startLocal.plus({ days: 1 });

    return {
      startUtc: startLocal.toUTC().toJSDate(),
      endUtc: endLocal.toUTC().toJSDate(),
    };
  }

  /**
   * Inclusive local-date range [from..to] (both YYYY-MM-DD) in timezone,
   * converted into UTC [startUtc, endUtcExclusive).
   */
  private getUtcRangeForZonedDateRange(
    from: string,
    to: string,
    timezone: string,
  ): UtcRange {
    const startUtc = this.getUtcRangeForZonedDate(from, timezone).startUtc;
    const endUtc = this.getUtcRangeForZonedDate(to, timezone).endUtc;

    if (startUtc >= endUtc) {
      throw new BadRequestException(
        `Invalid range: from must be <= to (from=${from}, to=${to})`,
      );
    }

    return { startUtc, endUtc };
  }

  private async loadRows(
    q: AnalyticsRangeQueryDto,
  ): Promise<{
    timezone: string;
    startUtc: Date;
    endUtc: Date;
    rows: MinimalRow[];
  }> {
    const timezone = this.tzOrDefault(q.timezone);
    const { startUtc, endUtc } = this.getUtcRangeForZonedDateRange(
      q.from,
      q.to,
      timezone,
    );

    const includeWalkIn = q.includeWalkIn ?? true;

    const where: any = {
      createdAt: { gte: startUtc, lt: endUtc },
    };

    if (!includeWalkIn) {
      where.bookingType = { not: 'WALK_IN' };
    }

    const rows = await this.prisma.bookingRequest.findMany({
      where,
      select: {
        createdAt: true,
        status: true,
        cancelReason: true,
        approvedAt: true,
        completedAt: true,
        cancelledAt: true,
        source: true,
        bookingType: true,
        utmCampaign: true,
        utmAdset: true,
        utmAd: true,
      },
    });

    return { timezone, startUtc, endUtc, rows: rows as MinimalRow[] };
  }

  async getOverview(q: AnalyticsRangeQueryDto) {
    const { timezone, startUtc, endUtc, rows } = await this.loadRows(q);

    const total = rows.length;

    const approved = rows.filter((r) => !!r.approvedAt).length;
    const completed = rows.filter(
      (r) => r.status === 'COMPLETED' || !!r.completedAt,
    ).length;
    const cancelled = rows.filter(
      (r) => r.status === 'CANCELLED' || !!r.cancelledAt,
    ).length;
    const noShow = rows.filter(
      (r) => r.status === 'CANCELLED' && r.cancelReason === 'NO_SHOW',
    ).length;

    const bySource: Record<string, number> = {};
    const byBookingType: Record<string, number> = {};

    for (const r of rows) {
      bySource[r.source] = (bySource[r.source] ?? 0) + 1;
      byBookingType[r.bookingType] = (byBookingType[r.bookingType] ?? 0) + 1;
    }

    return {
      timezone,
      range: { startUtc, endUtc },
      total,
      status: { approved, completed, cancelled, noShow },
      bySource,
      byBookingType,
    };
  }

  async getSources(q: AnalyticsRangeQueryDto) {
    const { timezone, startUtc, endUtc, rows } = await this.loadRows(q);

    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.source] = (counts[r.source] ?? 0) + 1;

    const items = Object.entries(counts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    return { timezone, range: { startUtc, endUtc }, total: rows.length, items };
  }

  async getUtm(q: AnalyticsUtmQueryDto) {
    const { timezone, startUtc, endUtc, rows } = await this.loadRows(q);

    const dim = q.dimension;

    const getKey = (r: MinimalRow) => {
      const v =
        dim === 'campaign'
          ? r.utmCampaign
          : dim === 'adset'
            ? r.utmAdset
            : r.utmAd;

      const trimmed = v?.trim();
      return trimmed ? trimmed : '(none)';
    };

    const counts: Record<string, number> = {};
    for (const r of rows) {
      const k = getKey(r);
      counts[k] = (counts[k] ?? 0) + 1;
    }

    const items = Object.entries(counts)
      .map(([key, count]) => ({ [dim]: key, count }))
      .sort((a: any, b: any) => b.count - a.count);

    return {
      timezone,
      range: { startUtc, endUtc },
      total: rows.length,
      dimension: dim,
      items,
    };
  }

  async getTimeseries(q: AnalyticsTimeseriesQueryDto) {
    const { timezone, startUtc, endUtc, rows } = await this.loadRows(q);

    const buckets = this.buildBuckets(q.from, q.to, q.granularity, timezone);
    const bucketMap = this.bucketsByKey(buckets);

    for (const r of rows) {
      const key = this.bucketKeyForDate(r.createdAt, q.granularity, timezone);
      const b = bucketMap.get(key);
      if (!b) continue;

      b.total++;
      if (r.approvedAt) b.approved++;
      if (r.status === 'COMPLETED' || r.completedAt) b.completed++;
      if (r.status === 'CANCELLED' || r.cancelledAt) b.cancelled++;
      if (r.status === 'CANCELLED' && r.cancelReason === 'NO_SHOW') b.noShow++;
    }

    // buckets already generated in chronological order, but keep deterministic:
    buckets.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());

    return {
      timezone,
      range: { startUtc, endUtc },
      granularity: q.granularity,
      items: buckets,
    };
  }

  private buildBuckets(
    from: string,
    to: string,
    granularity: 'day' | 'week' | 'month',
    tz: string,
  ): TimeseriesBucket[] {
    // inclusive local dates in tz
    const fromStart = DateTime.fromISO(from, { zone: tz }).startOf('day');
    const toStart = DateTime.fromISO(to, { zone: tz }).startOf('day');

    if (!fromStart.isValid || !toStart.isValid) {
      throw new BadRequestException(
        `Invalid from/to or timezone: from=${from}, to=${to}, tz=${tz}`,
      );
    }
    if (fromStart > toStart) {
      throw new BadRequestException(
        `Invalid range: from must be <= to (from=${from}, to=${to})`,
      );
    }

    const buckets: TimeseriesBucket[] = [];

    if (granularity === 'day') {
      let cur = fromStart;
      while (cur <= toStart) {
        const next = cur.plus({ days: 1 });
        buckets.push({
          key: cur.toFormat('yyyy-LL-dd'),
          label: cur.toFormat('yyyy-LL-dd'),
          startUtc: cur.toUTC().toJSDate(),
          endUtc: next.toUTC().toJSDate(),
          total: 0,
          approved: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
        });
        cur = next;
      }
      return buckets;
    }

    if (granularity === 'month') {
      let cur = fromStart.startOf('month');
      const endMonth = toStart.startOf('month');
      while (cur <= endMonth) {
        const next = cur.plus({ months: 1 });
        buckets.push({
          key: cur.toFormat('yyyy-LL'),
          label: cur.toFormat('yyyy LLL'),
          startUtc: cur.toUTC().toJSDate(),
          endUtc: next.toUTC().toJSDate(),
          total: 0,
          approved: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
        });
        cur = next;
      }
      return buckets;
    }

    // week: ISO weeks (Mon..Mon) in tz.
    // Create buckets from the ISO week containing `from` through the ISO week containing `to`.
    const startWeek = fromStart
      .startOf('week')
      .set({ weekday: 1 })
      .startOf('day');
    const endWeek = toStart.startOf('week').set({ weekday: 1 }).startOf('day');

    let cur = startWeek;
    while (cur <= endWeek) {
      const next = cur.plus({ weeks: 1 });
      const weekYear = cur.weekYear;
      const weekNumber = String(cur.weekNumber).padStart(2, '0');

      buckets.push({
        key: `${weekYear}-W${weekNumber}`,
        label: `${weekYear}-W${weekNumber}`,
        startUtc: cur.toUTC().toJSDate(),
        endUtc: next.toUTC().toJSDate(),
        total: 0,
        approved: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
      });

      cur = next;
    }

    return buckets;
  }

  private bucketKeyForDate(
    dateUtc: Date,
    granularity: 'day' | 'week' | 'month',
    tz: string,
  ): string {
    const dt = DateTime.fromJSDate(dateUtc, { zone: 'utc' }).setZone(tz);

    if (granularity === 'day') return dt.toFormat('yyyy-LL-dd');
    if (granularity === 'month') return dt.toFormat('yyyy-LL');

    // ISO week key like: 2026-W08
    const weekYear = dt.weekYear;
    const weekNumber = String(dt.weekNumber).padStart(2, '0');
    return `${weekYear}-W${weekNumber}`;
  }

  private bucketsByKey(buckets: TimeseriesBucket[]) {
    const m = new Map<string, TimeseriesBucket>();
    for (const b of buckets) m.set(b.key, b);
    return m;
  }
}
