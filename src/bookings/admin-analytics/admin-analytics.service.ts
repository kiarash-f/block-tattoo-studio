import { BadRequestException, Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyticsRangeQueryDto,
  AnalyticsTimeseriesQueryDto,
  AnalyticsUtmQueryDto,
} from './dto/analytics-range-query.dto';
import { AnalyticsCapacityQueryDto } from './dto/analytics-capacity-query.dto';

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

/**
 * One TattooSession joined to its artist's name and its BookingRequest's
 * lifecycle fields. Completion/cancellation are derived from the BookingRequest
 * (not TattooSession.completedAt, which the schedule-tattoo write path never
 * sets) — same source of truth as getOverview.
 */
type CapacitySessionRow = {
  artistId: string;
  stationId: string | null;
  artist: { displayName: string };
  bookingRequest: {
    status: BookingStatusString;
    cancelReason: CancelReasonString | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
    bookingType: string;
  };
};

type CapacityArtistRow = {
  artistId: string;
  artistName: string;
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  byStation: Record<string, number>;
};

type PaymentRevenueRow = {
  paidAt: Date;
  source: string;
  grossCents: number;
  netCents: number;
  vatAmountCents: number;
  vatRateBps: number;
};

type RevenueTotals = {
  grossCents: number;
  netCents: number;
  vatAmountCents: number;
  count: number;
};

type RevenueBucket = {
  key: string;
  label: string;
  startUtc: Date;
  endUtc: Date;
  totals: RevenueTotals;
  bySource: Record<string, RevenueTotals>;
};

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
  // Max buckets any timeseries may produce; also the day-span cap for aggregate
  // endpoints (M16). 366 = one leap year of daily buckets.
  private static readonly MAX_BUCKETS = 366;

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

  /**
   * Reject ranges that would produce more than MAX_BUCKETS buckets at the given
   * granularity (M16). Aggregate endpoints pass 'day', so they cap at 366 days;
   * timeseries endpoints cap at 366 buckets of their own granularity. Prevents
   * a stray `from=0001-01-01&to=9999-12-31` from building millions of buckets.
   */
  private assertRangeWithinCap(
    from: string,
    to: string,
    tz: string,
    granularity: 'day' | 'week' | 'month' = 'day',
  ): void {
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

    let buckets: number;
    if (granularity === 'month') {
      const a = fromStart.startOf('month');
      const b = toStart.startOf('month');
      buckets = Math.floor(b.diff(a, 'months').months) + 1;
    } else if (granularity === 'week') {
      const a = fromStart.startOf('week').set({ weekday: 1 }).startOf('day');
      const b = toStart.startOf('week').set({ weekday: 1 }).startOf('day');
      buckets = Math.floor(b.diff(a, 'weeks').weeks) + 1;
    } else {
      buckets = Math.floor(toStart.diff(fromStart, 'days').days) + 1;
    }

    if (buckets > AdminAnalyticsService.MAX_BUCKETS) {
      throw new BadRequestException(
        `Date range too large for granularity '${granularity}': ${buckets} buckets exceed the maximum of ${AdminAnalyticsService.MAX_BUCKETS}. Narrow the range or use a coarser granularity.`,
      );
    }
  }

  private async loadRows(q: AnalyticsRangeQueryDto): Promise<{
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
    this.assertRangeWithinCap(q.from, q.to, this.tzOrDefault(q.timezone));
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

  /**
   * Booking capacity by artist over a date range.
   *
   * Unit of count is the TattooSession (a multi-session tattoo contributes one
   * count per session), filtered by TattooSession.scheduledDate — the day the
   * artist actually works — using the same tz-aware UTC range as the rest of
   * this file. Optional artistId/stationId narrow to one artist/station.
   *
   * No `approved` field: a session can only exist if its booking was approved
   * (scheduleTattooSession runs only from CONSULT_APPROVED), so it is always
   * 100% and carries no information. completed/cancelled/noShow are derived
   * from the joined BookingRequest, identical to getOverview's status logic.
   */
  async getCapacity(q: AnalyticsCapacityQueryDto) {
    const timezone = this.tzOrDefault(q.timezone);
    this.assertRangeWithinCap(q.from, q.to, timezone);
    const { startUtc, endUtc } = this.getUtcRangeForZonedDateRange(
      q.from,
      q.to,
      timezone,
    );

    const includeWalkIn = q.includeWalkIn ?? true;

    const where: any = {
      scheduledDate: { gte: startUtc, lt: endUtc },
    };
    if (q.artistId) where.artistId = q.artistId;
    if (q.stationId) where.stationId = q.stationId;
    if (!includeWalkIn) {
      where.bookingRequest = { bookingType: { not: 'WALK_IN' } };
    }

    const sessions = (await this.prisma.tattooSession.findMany({
      where,
      select: {
        artistId: true,
        stationId: true,
        artist: { select: { displayName: true } },
        bookingRequest: {
          select: {
            status: true,
            cancelReason: true,
            completedAt: true,
            cancelledAt: true,
            bookingType: true,
          },
        },
      },
    })) as CapacitySessionRow[];

    // Aggregate by artistId in app code (plain accumulator, matching this file).
    const byArtist = new Map<string, CapacityArtistRow>();

    for (const s of sessions) {
      let row = byArtist.get(s.artistId);
      if (!row) {
        row = {
          artistId: s.artistId,
          artistName: s.artist.displayName,
          total: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
          byStation: {},
        };
        byArtist.set(s.artistId, row);
      }

      const br = s.bookingRequest;
      row.total++;
      if (br.status === 'COMPLETED' || br.completedAt) row.completed++;
      if (br.status === 'CANCELLED' || br.cancelledAt) row.cancelled++;
      if (br.status === 'CANCELLED' && br.cancelReason === 'NO_SHOW') {
        row.noShow++;
      }

      const stationKey = s.stationId ?? 'unassigned';
      row.byStation[stationKey] = (row.byStation[stationKey] ?? 0) + 1;
    }

    const artists = [...byArtist.values()].sort(
      (a, b) => b.total - a.total || a.artistId.localeCompare(b.artistId),
    );

    return {
      timezone,
      range: { startUtc, endUtc },
      artists,
    };
  }

  // ─── Revenue (Payment table; integer cents) ─────────────────────────────────
  //
  // Refund-awareness: revenue counts only status = PAID rows. Partial refunds
  // (refundedAmountCents) are NOT yet subtracted — no refund path exists. When
  // the refund feature lands, subtract refunds per row with net/VAT apportioned
  // by that row's vatRateBps:
  //   refundNet = round(refundedAmountCents / (1 + vatRateBps/10000))
  //   refundVat = refundedAmountCents - refundNet
  // so Σnet + Σvat stays reconciled with Σgross after refunds.

  /** Load PAID payments whose paidAt falls in [startUtc, endUtc). */
  private async loadPaidPayments(
    startUtc: Date,
    endUtc: Date,
  ): Promise<PaymentRevenueRow[]> {
    return this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { gte: startUtc, lt: endUtc },
      },
      select: {
        paidAt: true,
        source: true,
        grossCents: true,
        netCents: true,
        vatAmountCents: true,
        vatRateBps: true,
      },
    });
  }

  private emptyTotals(): RevenueTotals {
    return { grossCents: 0, netCents: 0, vatAmountCents: 0, count: 0 };
  }

  private addInto(acc: RevenueTotals, r: PaymentRevenueRow): void {
    acc.grossCents += r.grossCents;
    acc.netCents += r.netCents;
    acc.vatAmountCents += r.vatAmountCents;
    acc.count += 1;
  }

  /**
   * Revenue totals for a date range over PAID payments: overall gross/net/VAT,
   * a breakdown by source, and the net/VAT split grouped by vatRateBps (one
   * rate-group today; correct if a second rate ever appears). App-side
   * aggregation over the existing tz-aware UTC range — matches getOverview.
   */
  async getRevenueOverview(q: AnalyticsRangeQueryDto) {
    const timezone = this.tzOrDefault(q.timezone);
    this.assertRangeWithinCap(q.from, q.to, timezone);
    const { startUtc, endUtc } = this.getUtcRangeForZonedDateRange(
      q.from,
      q.to,
      timezone,
    );

    const rows = await this.loadPaidPayments(startUtc, endUtc);

    const totals = this.emptyTotals();
    const bySource: Record<string, RevenueTotals> = {};
    const byVatRateMap = new Map<number, RevenueTotals>();

    for (const r of rows) {
      this.addInto(totals, r);

      bySource[r.source] ??= this.emptyTotals();
      this.addInto(bySource[r.source], r);

      let rate = byVatRateMap.get(r.vatRateBps);
      if (!rate) {
        rate = this.emptyTotals();
        byVatRateMap.set(r.vatRateBps, rate);
      }
      this.addInto(rate, r);
    }

    const byVatRate = [...byVatRateMap.entries()]
      .map(([vatRateBps, t]) => ({ vatRateBps, ...t }))
      .sort((a, b) => a.vatRateBps - b.vatRateBps);

    return {
      timezone,
      range: { startUtc, endUtc },
      currency: 'EUR',
      totals,
      bySource,
      byVatRate,
    };
  }

  /**
   * Pre-bucketed revenue series (day/week/month) over PAID payments: gross/net/
   * VAT per bucket plus a per-source breakdown per bucket. Reuses the existing
   * tz-aware bucket boundaries (buildBuckets) and key function (bucketKeyForDate)
   * — same machinery and shape as getTimeseries.
   */
  async getRevenueTimeseries(q: AnalyticsTimeseriesQueryDto) {
    const timezone = this.tzOrDefault(q.timezone);
    this.assertRangeWithinCap(q.from, q.to, timezone, q.granularity);
    const { startUtc, endUtc } = this.getUtcRangeForZonedDateRange(
      q.from,
      q.to,
      timezone,
    );

    const rows = await this.loadPaidPayments(startUtc, endUtc);

    // Reuse the existing bucket boundaries (ignore their booking-specific zero
    // fields); build revenue buckets keyed by the same bucket key.
    const boundaries = this.buildBuckets(q.from, q.to, q.granularity, timezone);
    const bucketMap = new Map<string, RevenueBucket>();
    const items: RevenueBucket[] = boundaries.map((b) => {
      const rb: RevenueBucket = {
        key: b.key,
        label: b.label,
        startUtc: b.startUtc,
        endUtc: b.endUtc,
        totals: this.emptyTotals(),
        bySource: {},
      };
      bucketMap.set(b.key, rb);
      return rb;
    });

    for (const r of rows) {
      const key = this.bucketKeyForDate(r.paidAt, q.granularity, timezone);
      const rb = bucketMap.get(key);
      if (!rb) continue; // payment outside any generated bucket — skip defensively

      this.addInto(rb.totals, r);
      rb.bySource[r.source] ??= this.emptyTotals();
      this.addInto(rb.bySource[r.source], r);
    }

    return {
      timezone,
      range: { startUtc, endUtc },
      granularity: q.granularity,
      currency: 'EUR',
      items,
    };
  }

  async getUtm(q: AnalyticsUtmQueryDto) {
    this.assertRangeWithinCap(q.from, q.to, this.tzOrDefault(q.timezone));
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
    this.assertRangeWithinCap(
      q.from,
      q.to,
      this.tzOrDefault(q.timezone),
      q.granularity,
    );
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
