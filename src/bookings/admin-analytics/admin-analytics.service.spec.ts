import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAnalyticsService } from './admin-analytics.service';

async function createService() {
  const prisma = {
    payment: { findMany: jest.fn() },
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
