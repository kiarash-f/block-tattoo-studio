import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAnalyticsService } from './admin-analytics.service';

async function createService() {
  const prisma = {
    payment: { findMany: jest.fn() },
    tattooSession: { findMany: jest.fn() },
    bookingRequest: { findMany: jest.fn() },
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AdminAnalyticsService,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();
  return {
    service: module.get<AdminAnalyticsService>(AdminAnalyticsService),
    prisma,
  };
}

/** Mixed-source, mixed-rate fixture; each row already has net + vat == gross. */
const MIXED_ROWS = [
  {
    paidAt: new Date('2026-02-10T12:00:00Z'),
    source: 'TATTOO',
    grossCents: 11900,
    netCents: 10000,
    vatAmountCents: 1900,
    vatRateBps: 1900,
  },
  {
    paidAt: new Date('2026-02-11T12:00:00Z'),
    source: 'TATTOO',
    grossCents: 5950,
    netCents: 5000,
    vatAmountCents: 950,
    vatRateBps: 1900,
  },
  {
    paidAt: new Date('2026-02-12T12:00:00Z'),
    source: 'GUEST_TABLE',
    grossCents: 1070,
    netCents: 1000,
    vatAmountCents: 70,
    vatRateBps: 700,
  },
];

describe('AdminAnalyticsService — revenue range totals', () => {
  it('(a) sums reconcile, source breakdown + per-rate grouping correct', async () => {
    const { service, prisma } = await createService();
    prisma.payment.findMany.mockResolvedValue(MIXED_ROWS);

    const res = await service.getRevenueOverview({
      from: '2026-02-01',
      to: '2026-02-28',
    });

    // Totals
    expect(res.totals).toEqual({
      grossCents: 18920,
      netCents: 16000,
      vatAmountCents: 2920,
      count: 3,
    });
    // Reconciliation: Σnet + Σvat == Σgross
    expect(res.totals.netCents + res.totals.vatAmountCents).toBe(
      res.totals.grossCents,
    );

    // Breakdown by source
    expect(res.bySource.TATTOO).toEqual({
      grossCents: 17850,
      netCents: 15000,
      vatAmountCents: 2850,
      count: 2,
    });
    expect(res.bySource.GUEST_TABLE).toEqual({
      grossCents: 1070,
      netCents: 1000,
      vatAmountCents: 70,
      count: 1,
    });

    // Net/VAT grouped by vatRateBps, sorted ascending
    expect(res.byVatRate).toEqual([
      { vatRateBps: 700, grossCents: 1070, netCents: 1000, vatAmountCents: 70, count: 1 },
      { vatRateBps: 1900, grossCents: 17850, netCents: 15000, vatAmountCents: 2850, count: 2 },
    ]);
  });

  it('(b) queries only PAID rows (status filter excludes non-PAID)', async () => {
    const { service, prisma } = await createService();
    prisma.payment.findMany.mockResolvedValue([]);

    await service.getRevenueOverview({ from: '2026-02-01', to: '2026-02-28' });

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: PaymentStatus.PAID }),
      }),
    );
  });
});

describe('AdminAnalyticsService — revenue timeseries (timezone bucketing)', () => {
  it('(c) a payment past a Berlin day-boundary lands in the next-day bucket', async () => {
    const { service, prisma } = await createService();
    // Feb 2026 = CET (UTC+1, no DST).
    //  22:30Z → 23:30 Berlin (Feb 15)  → 2026-02-15 bucket
    //  23:30Z → 00:30 Berlin (Feb 16)  → 2026-02-16 bucket
    const sameDay = {
      paidAt: new Date('2026-02-15T22:30:00Z'),
      source: 'TATTOO',
      grossCents: 11900,
      netCents: 10000,
      vatAmountCents: 1900,
      vatRateBps: 1900,
    };
    const nextDay = {
      paidAt: new Date('2026-02-15T23:30:00Z'),
      source: 'TATTOO',
      grossCents: 5950,
      netCents: 5000,
      vatAmountCents: 950,
      vatRateBps: 1900,
    };
    prisma.payment.findMany.mockResolvedValue([sameDay, nextDay]);

    const res = await service.getRevenueTimeseries({
      from: '2026-02-15',
      to: '2026-02-16',
      granularity: 'day',
    });

    const feb15 = res.items.find((i) => i.key === '2026-02-15');
    const feb16 = res.items.find((i) => i.key === '2026-02-16');

    expect(feb15?.totals).toMatchObject({ count: 1, grossCents: 11900 });
    expect(feb16?.totals).toMatchObject({ count: 1, grossCents: 5950 });
  });
});

describe('AdminAnalyticsService — cancelled excluded from revenue', () => {
  it('(c) the revenue query filters status = PAID (so CANCELLED drops out)', async () => {
    const { service, prisma } = await createService();
    prisma.payment.findMany.mockResolvedValue([]);

    await service.getRevenueOverview({ from: '2026-02-01', to: '2026-02-28' });

    expect(prisma.payment.findMany.mock.calls[0][0].where.status).toBe(
      PaymentStatus.PAID,
    );
  });
});

// ─── Capacity by artist (TattooSession counts) ──────────────────────────────
//
// getCapacity filters TattooSession.scheduledDate in the tz-aware UTC range and
// derives completed/cancelled/noShow from the joined BookingRequest (not
// TattooSession.completedAt, which the schedule-tattoo path never writes).

/** Build a TattooSession-shaped row as returned by the mocked findMany. */
function sess(
  artistId: string,
  opts: {
    artistName?: string;
    stationId?: string | null;
    status?: string;
    cancelReason?: string | null;
    completedAt?: Date | null;
    cancelledAt?: Date | null;
    bookingType?: string;
  } = {},
) {
  return {
    artistId,
    stationId: opts.stationId ?? null,
    artist: { displayName: opts.artistName ?? artistId },
    bookingRequest: {
      status: opts.status ?? 'TATTOO_SCHEDULED',
      cancelReason: opts.cancelReason ?? null,
      completedAt: opts.completedAt ?? null,
      cancelledAt: opts.cancelledAt ?? null,
      bookingType: opts.bookingType ?? 'APPOINTMENT',
    },
  };
}

const CAP_RANGE = { from: '2026-02-01', to: '2026-02-28' };

describe('AdminAnalyticsService — capacity by artist', () => {
  it('(a) two sessions for the same artist in range sum correctly', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([
      sess('a1', { artistName: 'Ada' }),
      sess('a1', { artistName: 'Ada' }),
    ]);

    const res = await service.getCapacity(CAP_RANGE);

    expect(res.artists).toHaveLength(1);
    expect(res.artists[0]).toMatchObject({
      artistId: 'a1',
      artistName: 'Ada',
      total: 2,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    });
  });

  it('(b) the query filters TattooSession.scheduledDate to the tz-aware range (out-of-range rows never returned)', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([]);

    await service.getCapacity(CAP_RANGE);

    // Europe/Berlin, Feb 2026 = CET (UTC+1):
    //   2026-02-01 00:00 Berlin → 2026-01-31T23:00:00Z (inclusive)
    //   2026-03-01 00:00 Berlin → 2026-02-28T23:00:00Z (exclusive)
    const where = prisma.tattooSession.findMany.mock.calls[0][0].where;
    expect(where.scheduledDate.gte).toEqual(new Date('2026-01-31T23:00:00Z'));
    expect(where.scheduledDate.lt).toEqual(new Date('2026-02-28T23:00:00Z'));
  });

  it('(c) a cancelled booking\'s session still counts in total and cancelled', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([
      sess('a1', { status: 'CANCELLED', cancelledAt: new Date('2026-02-10T10:00:00Z') }),
    ]);

    const res = await service.getCapacity(CAP_RANGE);

    expect(res.artists[0]).toMatchObject({ total: 1, cancelled: 1, noShow: 0 });
  });

  it('(d) a NO_SHOW-cancelled session counts in both cancelled and noShow', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([
      sess('a1', {
        status: 'CANCELLED',
        cancelReason: 'NO_SHOW',
        cancelledAt: new Date('2026-02-10T10:00:00Z'),
      }),
    ]);

    const res = await service.getCapacity(CAP_RANGE);

    expect(res.artists[0]).toMatchObject({ total: 1, cancelled: 1, noShow: 1 });
  });

  it('(e) artistId filter narrows the query to one artist', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([sess('a1')]);

    await service.getCapacity({ ...CAP_RANGE, artistId: 'a1' });

    expect(prisma.tattooSession.findMany.mock.calls[0][0].where.artistId).toBe(
      'a1',
    );
  });

  it('(f) an artist with zero sessions in range does not appear at all', async () => {
    const { service, prisma } = await createService();
    // Only a1 has sessions in range; a2 has none → a2 must be absent (not a zero row).
    prisma.tattooSession.findMany.mockResolvedValue([sess('a1'), sess('a1')]);

    const res = await service.getCapacity(CAP_RANGE);

    expect(res.artists.map((a) => a.artistId)).toEqual(['a1']);
    expect(res.artists.find((a) => a.artistId === 'a2')).toBeUndefined();
  });

  it('(g) byStation groups by stationId, with an "unassigned" bucket for null', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([
      sess('a1', { stationId: 's1' }),
      sess('a1', { stationId: 's1' }),
      sess('a1', { stationId: null }),
    ]);

    const res = await service.getCapacity(CAP_RANGE);

    expect(res.artists[0].total).toBe(3);
    expect(res.artists[0].byStation).toEqual({ s1: 2, unassigned: 1 });
  });

  it('(h) includeWalkIn=false excludes WALK_IN sessions via the joined BookingRequest', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([]);

    await service.getCapacity({ ...CAP_RANGE, includeWalkIn: false });

    const where = prisma.tattooSession.findMany.mock.calls[0][0].where;
    expect(where.bookingRequest).toEqual({ bookingType: { not: 'WALK_IN' } });
  });
});

// ─── Overview & timeseries (BookingRequest pipeline counts) ─────────────────
//
// Both getOverview and getTimeseries read BookingRequest rows via the shared
// loadRows() (mocks prisma.bookingRequest.findMany). Status logic mirrors the
// service exactly: approved = approvedAt set; completed = status COMPLETED OR
// completedAt set; cancelled = status CANCELLED OR cancelledAt set; noShow =
// status CANCELLED AND cancelReason NO_SHOW (a subset of cancelled).

/** Build a BookingRequest row as returned by the mocked findMany (loadRows shape). */
function bkg(
  createdAt: string,
  opts: {
    status?: string;
    cancelReason?: string | null;
    approvedAt?: string | null;
    completedAt?: string | null;
    cancelledAt?: string | null;
    source?: string;
    bookingType?: string;
  } = {},
) {
  return {
    createdAt: new Date(createdAt),
    status: opts.status ?? 'PENDING_CONSULT',
    cancelReason: opts.cancelReason ?? null,
    approvedAt: opts.approvedAt ? new Date(opts.approvedAt) : null,
    completedAt: opts.completedAt ? new Date(opts.completedAt) : null,
    cancelledAt: opts.cancelledAt ? new Date(opts.cancelledAt) : null,
    source: opts.source ?? 'DIRECT',
    bookingType: opts.bookingType ?? 'APPOINTMENT',
    utmCampaign: null,
    utmAdset: null,
    utmAd: null,
  };
}

const OV_RANGE = { from: '2026-02-01', to: '2026-02-28' };

/**
 * Mixed pipeline fixture (5 rows). Expected roll-up:
 *   total=5, approved=2, completed=2, cancelled=2, noShow=1 (⊆ cancelled)
 *   bySource: DIRECT 2, INSTAGRAM 2, GOOGLE 1
 *   byBookingType: APPOINTMENT 3, WALK_IN 2
 */
const OV_MIXED = [
  // approved-only
  bkg('2026-02-03T10:00:00Z', {
    status: 'CONSULT_APPROVED',
    approvedAt: '2026-02-03T10:00:00Z',
    source: 'DIRECT',
    bookingType: 'APPOINTMENT',
  }),
  // completed via status COMPLETED (also approved)
  bkg('2026-02-05T10:00:00Z', {
    status: 'COMPLETED',
    approvedAt: '2026-02-04T10:00:00Z',
    source: 'INSTAGRAM',
    bookingType: 'APPOINTMENT',
  }),
  // completed via completedAt timestamp (status not COMPLETED)
  bkg('2026-02-07T10:00:00Z', {
    status: 'TATTOO_SCHEDULED',
    completedAt: '2026-02-20T10:00:00Z',
    source: 'DIRECT',
    bookingType: 'WALK_IN',
  }),
  // plain cancellation (no NO_SHOW)
  bkg('2026-02-10T10:00:00Z', {
    status: 'CANCELLED',
    cancelledAt: '2026-02-11T10:00:00Z',
    cancelReason: 'CLIENT_CANCELLED',
    source: 'GOOGLE',
    bookingType: 'APPOINTMENT',
  }),
  // NO_SHOW cancellation — must count in BOTH cancelled and noShow, once each
  bkg('2026-02-12T10:00:00Z', {
    status: 'CANCELLED',
    cancelledAt: '2026-02-13T10:00:00Z',
    cancelReason: 'NO_SHOW',
    source: 'INSTAGRAM',
    bookingType: 'WALK_IN',
  }),
];

describe('AdminAnalyticsService — getOverview', () => {
  it('(a) total matches the number of mocked rows for the range', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findMany.mockResolvedValue(OV_MIXED);

    const res = await service.getOverview(OV_RANGE);

    expect(res.total).toBe(OV_MIXED.length);
    expect(res.total).toBe(5);
  });

  it('(b) status breakdown is correct; noShow is a subset of cancelled, not double-counted', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findMany.mockResolvedValue(OV_MIXED);

    const res = await service.getOverview(OV_RANGE);

    expect(res.status).toEqual({
      approved: 2,
      completed: 2,
      cancelled: 2,
      noShow: 1,
    });
    // noShow rows are counted within cancelled, not added on top of it.
    expect(res.status.noShow).toBeLessThanOrEqual(res.status.cancelled);
  });

  it('(c) bySource groups rows across multiple IntakeSource values', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findMany.mockResolvedValue(OV_MIXED);

    const res = await service.getOverview(OV_RANGE);

    expect(res.bySource).toEqual({ DIRECT: 2, INSTAGRAM: 2, GOOGLE: 1 });
  });

  it('(d) byBookingType groups rows across multiple BookingType values', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findMany.mockResolvedValue(OV_MIXED);

    const res = await service.getOverview(OV_RANGE);

    expect(res.byBookingType).toEqual({ APPOINTMENT: 3, WALK_IN: 2 });
  });

  it('(e) includeWalkIn=false queries with a where clause excluding WALK_IN', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findMany.mockResolvedValue([]);

    await service.getOverview({ ...OV_RANGE, includeWalkIn: false });

    expect(prisma.bookingRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bookingType: { not: 'WALK_IN' } }),
      }),
    );
  });

  it('(f) an invalid range (from > to) throws BadRequestException through getOverview', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findMany.mockResolvedValue([]);

    await expect(
      service.getOverview({ from: '2026-02-28', to: '2026-02-01' }),
    ).rejects.toThrow(BadRequestException);
    // validation short-circuits before any DB read
    expect(prisma.bookingRequest.findMany).not.toHaveBeenCalled();
  });
});

describe('AdminAnalyticsService — getTimeseries', () => {
  it('(g) a createdAt past a Berlin day-boundary lands in the next-day bucket', async () => {
    const { service, prisma } = await createService();
    // Feb 2026 = CET (UTC+1, no DST).
    //  22:30Z → 23:30 Berlin (Feb 15) → 2026-02-15 bucket
    //  23:30Z → 00:30 Berlin (Feb 16) → 2026-02-16 bucket
    prisma.bookingRequest.findMany.mockResolvedValue([
      bkg('2026-02-15T22:30:00Z'),
      bkg('2026-02-15T23:30:00Z'),
    ]);

    const res = await service.getTimeseries({
      from: '2026-02-15',
      to: '2026-02-16',
      granularity: 'day',
    });

    const feb15 = res.items.find((i) => i.key === '2026-02-15');
    const feb16 = res.items.find((i) => i.key === '2026-02-16');
    expect(feb15?.total).toBe(1);
    expect(feb16?.total).toBe(1);
  });

  it('(h) week granularity buckets across an ISO week boundary (Mon-start)', async () => {
    const { service, prisma } = await createService();
    // 2026-02-08 is a Sunday (ISO 2026-W06); 2026-02-09 is Monday (ISO 2026-W07).
    // Midday UTC keeps each firmly inside its Berlin calendar day.
    prisma.bookingRequest.findMany.mockResolvedValue([
      bkg('2026-02-08T12:00:00Z'),
      bkg('2026-02-09T12:00:00Z'),
    ]);

    const res = await service.getTimeseries({
      from: '2026-02-08',
      to: '2026-02-09',
      granularity: 'week',
    });

    const w06 = res.items.find((i) => i.key === '2026-W06');
    const w07 = res.items.find((i) => i.key === '2026-W07');
    expect(w06?.total).toBe(1);
    expect(w07?.total).toBe(1);
    // The two rows land in distinct, adjacent week buckets — not the same one.
    expect(res.items).toHaveLength(2);
  });

  it('(i) month granularity buckets across a month boundary', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findMany.mockResolvedValue([
      bkg('2026-02-25T12:00:00Z'),
      bkg('2026-03-02T12:00:00Z'),
    ]);

    const res = await service.getTimeseries({
      from: '2026-02-25',
      to: '2026-03-02',
      granularity: 'month',
    });

    const feb = res.items.find((i) => i.key === '2026-02');
    const mar = res.items.find((i) => i.key === '2026-03');
    expect(feb?.total).toBe(1);
    expect(mar?.total).toBe(1);
  });

  it('(j) a bucket with zero matching rows still appears with all counts at zero', async () => {
    const { service, prisma } = await createService();
    // Rows only on Feb 15 and Feb 17; Feb 16 must still appear, empty.
    prisma.bookingRequest.findMany.mockResolvedValue([
      bkg('2026-02-15T12:00:00Z'),
      bkg('2026-02-17T12:00:00Z'),
    ]);

    const res = await service.getTimeseries({
      from: '2026-02-15',
      to: '2026-02-17',
      granularity: 'day',
    });

    expect(res.items).toHaveLength(3);
    const feb16 = res.items.find((i) => i.key === '2026-02-16');
    expect(feb16).toMatchObject({
      total: 0,
      approved: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    });
  });

  it('(k) status breakdown is computed per-bucket, not aggregated across the range', async () => {
    const { service, prisma } = await createService();
    // Feb 15: one approved + one NO_SHOW-cancelled.
    // Feb 16: one completed + one plain-cancelled.
    // Aggregating across the range would blur these; each bucket must stand alone.
    prisma.bookingRequest.findMany.mockResolvedValue([
      bkg('2026-02-15T12:00:00Z', {
        status: 'CONSULT_APPROVED',
        approvedAt: '2026-02-15T12:00:00Z',
      }),
      bkg('2026-02-15T13:00:00Z', {
        status: 'CANCELLED',
        cancelledAt: '2026-02-15T13:00:00Z',
        cancelReason: 'NO_SHOW',
      }),
      bkg('2026-02-16T12:00:00Z', { status: 'COMPLETED' }),
      bkg('2026-02-16T13:00:00Z', {
        status: 'CANCELLED',
        cancelledAt: '2026-02-16T13:00:00Z',
        cancelReason: 'CLIENT_CANCELLED',
      }),
    ]);

    const res = await service.getTimeseries({
      from: '2026-02-15',
      to: '2026-02-16',
      granularity: 'day',
    });

    const feb15 = res.items.find((i) => i.key === '2026-02-15');
    const feb16 = res.items.find((i) => i.key === '2026-02-16');

    expect(feb15).toMatchObject({
      total: 2,
      approved: 1,
      completed: 0,
      cancelled: 1,
      noShow: 1,
    });
    expect(feb16).toMatchObject({
      total: 2,
      approved: 0,
      completed: 1,
      cancelled: 1,
      noShow: 0,
    });
  });
});
