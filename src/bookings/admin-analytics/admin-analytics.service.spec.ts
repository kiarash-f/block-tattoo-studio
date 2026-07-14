import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAnalyticsService } from './admin-analytics.service';

async function createService() {
  const prisma = {
    payment: { findMany: jest.fn() },
    tattooSession: { findMany: jest.fn() },
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
