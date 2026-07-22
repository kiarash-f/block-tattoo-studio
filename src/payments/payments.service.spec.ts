import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentSource, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';

/**
 * Builds a PaymentsService with mocked Prisma + Config.
 * `payment.create` echoes the `data` it was given, so tests can read the
 * computed netCents/vatAmountCents/vatRateBps straight off the result.
 */
async function createService(defaultVatRateBps = 1900) {
  const prisma = {
    payment: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'pay_test', ...data }),
      ),
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => Promise.resolve({ id: where.id, ...data })),
    },
    bookingRequest: { findUnique: jest.fn() },
    guestArtistBooking: { findUnique: jest.fn() },
    voucherSale: { findUnique: jest.fn() },
    // Invoice write + gap-free counter allocation, exercised inside recordPayment.
    invoice: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'inv_test', ...data }),
      ),
      findUnique: jest.fn(),
    },
    // $queryRaw backs the InvoiceCounter INSERT ... ON CONFLICT ... RETURNING.
    $queryRaw: jest.fn(() => Promise.resolve([{ lastNumber: 1 }])),
    // Handle BOTH forms: the [count, findMany] tuple (list) and the interactive
    // callback (recordPayment wraps payment + invoice in one transaction).
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(prisma)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  const config = {
    get: jest.fn((key: string, def?: unknown) =>
      key === 'VAT_RATE_BPS' ? defaultVatRateBps : def,
    ),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PaymentsService,
      InvoiceService,
      { provide: PrismaService, useValue: prisma },
      { provide: ConfigService, useValue: config },
    ],
  }).compile();

  return { service: module.get<PaymentsService>(PaymentsService), prisma, config };
}

type MockPrisma = Awaited<ReturnType<typeof createService>>['prisma'];

/** A valid GUEST_TABLE payment input, parameterised by amount + optional rate. */
function guestInput(grossCents: number, vatRateBps?: number) {
  return {
    source: PaymentSource.GUEST_TABLE,
    method: PaymentMethod.LINK,
    grossCents,
    guestArtistBookingId: 'gab_1',
    ...(vatRateBps !== undefined ? { vatRateBps } : {}),
  };
}

describe('PaymentsService — VAT split', () => {
  // Amounts chosen to span small edges and larger values. None divides evenly
  // by 1.19, so the rounding remainder must be absorbed by VAT every time.
  const grossValues = [1, 99, 100, 105, 119, 1000, 1234, 4999, 999999];

  it.each(grossValues)(
    'reconciles and rounds net half-up at 1900 bps (gross=%i)',
    async (grossCents) => {
      const { service } = await createService();

      const payment = await service.recordPayment(guestInput(grossCents));

      const expectedNet = Math.round(grossCents / 1.19);
      expect(payment.netCents).toBe(expectedNet);
      expect(payment.vatAmountCents).toBe(grossCents - expectedNet);
      // The invariant the whole foundation relies on:
      expect(payment.netCents + payment.vatAmountCents).toBe(grossCents);
      expect(payment.vatRateBps).toBe(1900);
    },
  );

  it('honors an explicit non-19% rate (700 bps), not a hardcoded 1.19', async () => {
    const { service } = await createService();

    const payment = await service.recordPayment(guestInput(1070, 700));

    // 1070 / 1.07 = 1000 exactly
    expect(payment.netCents).toBe(1000);
    expect(payment.vatAmountCents).toBe(70);
    expect(payment.netCents + payment.vatAmountCents).toBe(1070);
    expect(payment.vatRateBps).toBe(700);
  });

  it('handles a 0% rate (net == gross, vat == 0)', async () => {
    const { service } = await createService();

    const payment = await service.recordPayment(guestInput(5000, 0));

    expect(payment.netCents).toBe(5000);
    expect(payment.vatAmountCents).toBe(0);
    expect(payment.vatRateBps).toBe(0);
  });

  it('falls back to the configured default rate when none is passed', async () => {
    const { service } = await createService(1900);

    const payment = await service.recordPayment(guestInput(2380));

    // 2380 / 1.19 = 2000 exactly; 380 VAT
    expect(payment.netCents).toBe(2000);
    expect(payment.vatAmountCents).toBe(380);
    expect(payment.vatRateBps).toBe(1900);
  });
});

describe('PaymentsService — exactly-one-target invariant', () => {
  const GROSS = 1000;

  // ── Rejections: must throw before any Payment row is written ────────────────

  it('rejects TATTOO with no target', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.recordPayment({
        source: PaymentSource.TATTOO,
        method: PaymentMethod.CASH,
        grossCents: GROSS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects GUEST_TABLE with no target', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.recordPayment({
        source: PaymentSource.GUEST_TABLE,
        method: PaymentMethod.CASH,
        grossCents: GROSS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects two targets set at once (TATTOO + both FKs)', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.recordPayment({
        source: PaymentSource.TATTOO,
        method: PaymentMethod.CASH,
        grossCents: GROSS,
        bookingRequestId: 'br_1',
        guestArtistBookingId: 'gab_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a target that disagrees with source (TATTOO + guestArtistBookingId)', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.recordPayment({
        source: PaymentSource.TATTOO,
        method: PaymentMethod.CASH,
        grossCents: GROSS,
        guestArtistBookingId: 'gab_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a target that disagrees with source (GUEST_TABLE + bookingRequestId)', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.recordPayment({
        source: PaymentSource.GUEST_TABLE,
        method: PaymentMethod.CASH,
        grossCents: GROSS,
        bookingRequestId: 'br_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects VOUCHER with no voucherSaleId', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.recordPayment({
        source: PaymentSource.VOUCHER,
        method: PaymentMethod.CASH,
        grossCents: GROSS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects VOUCHER with a disagreeing target (VOUCHER + bookingRequestId)', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.recordPayment({
        source: PaymentSource.VOUCHER,
        method: PaymentMethod.LINK,
        grossCents: GROSS,
        voucherSaleId: 'vs_1',
        bookingRequestId: 'br_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  // ── Acceptances: the valid source↔target pairings that exist today ──────────

  it('accepts TATTOO + bookingRequestId', async () => {
    const { service, prisma } = await createService();
    const payment = await service.recordPayment({
      source: PaymentSource.TATTOO,
      method: PaymentMethod.CASH,
      grossCents: GROSS,
      bookingRequestId: 'br_1',
    });
    expect(prisma.payment.create).toHaveBeenCalledTimes(1);
    expect(payment.bookingRequestId).toBe('br_1');
    expect(payment.guestArtistBookingId).toBeNull();
    expect(payment.source).toBe(PaymentSource.TATTOO);
  });

  it('accepts GUEST_TABLE + guestArtistBookingId', async () => {
    const { service, prisma } = await createService();
    const payment = await service.recordPayment({
      source: PaymentSource.GUEST_TABLE,
      method: PaymentMethod.LINK,
      grossCents: GROSS,
      guestArtistBookingId: 'gab_1',
    });
    expect(prisma.payment.create).toHaveBeenCalledTimes(1);
    expect(payment.guestArtistBookingId).toBe('gab_1');
    expect(payment.bookingRequestId).toBeNull();
    expect(payment.source).toBe(PaymentSource.GUEST_TABLE);
  });

  it('(e) accepts VOUCHER + voucherSaleId', async () => {
    const { service, prisma } = await createService();
    const payment = await service.recordPayment({
      source: PaymentSource.VOUCHER,
      method: PaymentMethod.LINK,
      grossCents: GROSS,
      voucherSaleId: 'vs_1',
    });
    expect(prisma.payment.create).toHaveBeenCalledTimes(1);
    expect(payment.voucherSaleId).toBe('vs_1');
    expect(payment.bookingRequestId).toBeNull();
    expect(payment.guestArtistBookingId).toBeNull();
    expect(payment.source).toBe(PaymentSource.VOUCHER);
  });
});

describe('PaymentsService — booking balance (computed fresh)', () => {
  /** Configure the booking price + the PAID-rows aggregate the helper returns. */
  function setup(
    prisma: {
      bookingRequest: { findUnique: jest.Mock };
      payment: { aggregate: jest.Mock };
    },
    agreedPriceCents: number | null,
    grossCents: number | null,
    refundedAmountCents: number | null,
  ) {
    prisma.bookingRequest.findUnique.mockResolvedValue({ agreedPriceCents });
    prisma.payment.aggregate.mockResolvedValue({
      _sum: { grossCents, refundedAmountCents },
    });
  }

  it('priced booking with PAID rows → paid summed, remaining = price − paid', async () => {
    const { service, prisma } = await createService();
    setup(prisma, 30000, 10000, null);

    const b = await service.getBookingBalance('br_1');

    expect(b.agreedPriceCents).toBe(30000);
    expect(b.paidCents).toBe(10000);
    expect(b.remainingCents).toBe(20000);
    expect(b.fullyPaid).toBe(false);
  });

  it('unpriced booking → remaining null, never fullyPaid', async () => {
    const { service, prisma } = await createService();
    setup(prisma, null, 5000, null);

    const b = await service.getBookingBalance('br_1');

    expect(b.agreedPriceCents).toBeNull();
    expect(b.paidCents).toBe(5000);
    expect(b.remainingCents).toBeNull();
    expect(b.fullyPaid).toBe(false);
  });

  it('a refunded amount on PAID rows reduces paid', async () => {
    const { service, prisma } = await createService();
    setup(prisma, 30000, 20000, 5000);

    const b = await service.getBookingBalance('br_1');

    expect(b.paidCents).toBe(15000); // 20000 gross − 5000 refunded
    expect(b.remainingCents).toBe(15000);
    expect(b.fullyPaid).toBe(false);
  });

  it('no payments yet → paid 0 (null sums coalesced)', async () => {
    const { service, prisma } = await createService();
    setup(prisma, 10000, null, null);

    const b = await service.getBookingBalance('br_1');

    expect(b.paidCents).toBe(0);
    expect(b.remainingCents).toBe(10000);
    expect(b.fullyPaid).toBe(false);
  });

  it('fully paid hitting exactly 0 → fullyPaid true', async () => {
    const { service, prisma } = await createService();
    setup(prisma, 10000, 10000, null);

    const b = await service.getBookingBalance('br_1');

    expect(b.remainingCents).toBe(0);
    expect(b.fullyPaid).toBe(true);
  });
});

describe('PaymentsService — over-payment warning', () => {
  function setup(
    prisma: {
      bookingRequest: { findUnique: jest.Mock };
      payment: { aggregate: jest.Mock };
    },
    agreedPriceCents: number | null,
    paidGrossCents: number | null,
  ) {
    prisma.bookingRequest.findUnique.mockResolvedValue({ agreedPriceCents });
    prisma.payment.aggregate.mockResolvedValue({
      _sum: { grossCents: paidGrossCents, refundedAmountCents: null },
    });
  }

  it('fires when paid total exceeds the agreed price (with overage)', async () => {
    const { service, prisma } = await createService();
    setup(prisma, 10000, 12000);

    const r = await service.checkOverPayment('br_1');

    expect(r.overPaymentWarning).toBe(true);
    expect(r.overageCents).toBe(2000);
  });

  it('does NOT fire when paid total equals the agreed price', async () => {
    const { service, prisma } = await createService();
    setup(prisma, 10000, 10000);

    const r = await service.checkOverPayment('br_1');

    expect(r.overPaymentWarning).toBe(false);
    expect(r.overageCents).toBe(0);
  });

  it('does NOT fire when paid total is under the agreed price', async () => {
    const { service, prisma } = await createService();
    setup(prisma, 10000, 8000);

    const r = await service.checkOverPayment('br_1');

    expect(r.overPaymentWarning).toBe(false);
    expect(r.overageCents).toBe(0);
  });

  it('does NOT fire for an unpriced booking', async () => {
    const { service, prisma } = await createService();
    setup(prisma, null, 5000);

    const r = await service.checkOverPayment('br_1');

    expect(r.overPaymentWarning).toBe(false);
    expect(r.overageCents).toBe(0);
  });
});

describe('PaymentsService — list context normalization', () => {
  function row(overrides: Record<string, unknown>) {
    return {
      id: 'p',
      source: PaymentSource.TATTOO,
      method: PaymentMethod.CASH,
      status: 'PAID',
      currency: 'EUR',
      grossCents: 10000,
      netCents: 8403,
      vatAmountCents: 1597,
      vatRateBps: 1900,
      paidAt: new Date('2026-06-17T12:00:00Z'),
      note: null,
      refundedAt: null,
      refundedAmountCents: null,
      createdByAdmin: null,
      bookingRequest: null,
      guestArtistBooking: null,
      ...overrides,
    };
  }

  it('(d) resolves context for tattoo vs guest sources; never leaks raw relations', async () => {
    const { service, prisma } = await createService();

    const tattoo = row({
      id: 'p_tattoo',
      source: PaymentSource.TATTOO,
      bookingRequest: {
        id: 'br1',
        client: { firstName: 'Jane', lastName: 'Doe', email: 'jane@x.com' },
      },
    });
    const guest = row({
      id: 'p_guest',
      source: PaymentSource.GUEST_TABLE,
      guestArtistBooking: { id: 'gab1', name: 'Alex', email: 'alex@x.com' },
    });

    prisma.payment.count.mockResolvedValue(2);
    prisma.payment.findMany.mockResolvedValue([tattoo, guest]);

    const res = await service.list({ page: 1, limit: 20 });

    expect(res.total).toBe(2);
    expect(res.items).toHaveLength(2);

    const [t, g] = res.items;

    expect(t.context).toEqual({
      source: PaymentSource.TATTOO,
      customerName: 'Jane Doe',
      customerEmail: 'jane@x.com',
      reference: 'br1',
    });
    expect(g.context).toEqual({
      source: PaymentSource.GUEST_TABLE,
      customerName: 'Alex',
      customerEmail: 'alex@x.com',
      reference: 'gab1',
    });

    // Raw nested relations are not leaked into the list shape.
    expect((t as Record<string, unknown>).bookingRequest).toBeUndefined();
    expect((g as Record<string, unknown>).guestArtistBooking).toBeUndefined();
  });
});

/**
 * M6 — the payments list filters `paidAt` on Berlin calendar days, the same
 * convention revenue analytics uses, so the same from/to returns the same rows
 * in both admin views. The expected UTC boundary instants below are derived by
 * hand from "Berlin local midnight" (NOT from the helper under test), so a drift
 * in the Berlin-day math surfaces here instead of being mirrored. Both a summer
 * range and a DST fall-back range are covered so the math can't silently shift
 * by a day across a transition.
 */
describe('PaymentsService — list Berlin-day boundary (M6)', () => {
  async function paidAtBoundsFor(from: string, to: string) {
    const { service, prisma } = await createService();
    prisma.payment.count.mockResolvedValue(0);
    prisma.payment.findMany.mockResolvedValue([]);
    await service.list({ from, to });
    const where = prisma.payment.findMany.mock.calls[0][0].where as {
      paidAt: { gte: Date; lt: Date };
    };
    return where.paidAt;
  }

  it('(a) summer range: 23:30 Berlin on the last day is included, 00:30 next day excluded', async () => {
    const paidAt = await paidAtBoundsFor('2026-06-01', '2026-06-30');

    // Berlin is UTC+2 in summer.
    expect(paidAt.gte.toISOString()).toBe('2026-05-31T22:00:00.000Z');
    expect(paidAt.lt.toISOString()).toBe('2026-06-30T22:00:00.000Z');

    const inRange = (d: string) =>
      paidAt.gte <= new Date(d) && new Date(d) < paidAt.lt;
    // 23:30 Berlin on Jun 30 (last day) = 21:30Z → still June in Berlin → included
    expect(inRange('2026-06-30T21:30:00.000Z')).toBe(true);
    // 00:30 Berlin on Jul 1 = 22:30Z Jun 30 → July in Berlin → excluded
    expect(inRange('2026-06-30T22:30:00.000Z')).toBe(false);
  });

  it('(b) DST fall-back range: Berlin-day math does not drift by a day', async () => {
    // Clocks go back on 2026-10-25. Oct 1 start is still summer (UTC+2); the
    // exclusive end (Oct 26 start) is winter (UTC+1) — a 1h, not 2h, offset.
    const paidAt = await paidAtBoundsFor('2026-10-01', '2026-10-25');

    expect(paidAt.gte.toISOString()).toBe('2026-09-30T22:00:00.000Z');
    expect(paidAt.lt.toISOString()).toBe('2026-10-25T23:00:00.000Z');

    const inRange = (d: string) =>
      paidAt.gte <= new Date(d) && new Date(d) < paidAt.lt;
    // 23:30 Berlin on Oct 25 (winter, last day) = 22:30Z → included
    expect(inRange('2026-10-25T22:30:00.000Z')).toBe(true);
    // 00:30 Berlin on Oct 26 = 23:30Z Oct 25 → excluded
    expect(inRange('2026-10-25T23:30:00.000Z')).toBe(false);
  });
});

/**
 * cancelPayment is a conditional updateMany guarded on status = PAID (M1), so
 * these mocks drive `updateMany.count`: 1 = this call won the flip, 0 = it lost
 * (or the row was never PAID) and the service re-reads to explain why. The
 * cancellation reason goes in its own set-once `cancellationReason` field — the
 * original `note` is never read or rewritten (GoBD §8.3).
 */
describe('PaymentsService — cancelPayment', () => {
  /** Mock a flip that succeeds (count = 1). */
  function arrangeWin(prisma: MockPrisma) {
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findUniqueOrThrow.mockResolvedValue({
      id: 'p1',
      status: PaymentStatus.CANCELLED,
    });
  }

  /** Mock a flip that matched nothing, with `current` as the re-read state. */
  function arrangeLoss(
    prisma: MockPrisma,
    current: { status: PaymentStatus } | null,
  ) {
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });
    prisma.payment.findUnique.mockResolvedValue(current);
  }

  it('(a) flips PAID → CANCELLED and stamps the audit fields', async () => {
    const { service, prisma } = await createService();
    arrangeWin(prisma);

    const res = await service.cancelPayment('p1', 'admin_1', 'Refunded in cash');

    expect(prisma.payment.updateMany).toHaveBeenCalledTimes(1);
    const call = prisma.payment.updateMany.mock.calls[0][0];
    // The guard: only a still-PAID row is eligible.
    expect(call.where).toEqual({ id: 'p1', status: PaymentStatus.PAID });
    expect(call.data.status).toBe(PaymentStatus.CANCELLED);
    expect(call.data.cancelledByAdminId).toBe('admin_1');
    expect(call.data.cancelledAt).toBeInstanceOf(Date);
    // Reason in its own field; note is never touched by the update.
    expect(call.data.cancellationReason).toBe('Refunded in cash');
    expect(call.data.note).toBeUndefined();
    expect(res.status).toBe(PaymentStatus.CANCELLED);
  });

  it('records the reason in cancellationReason, never touching note', async () => {
    const { service, prisma } = await createService();
    arrangeWin(prisma);
    await service.cancelPayment('p1', 'admin_1', 'refunded');
    const data = prisma.payment.updateMany.mock.calls[0][0].data;
    expect(data.cancellationReason).toBe('refunded');
    expect(data.note).toBeUndefined();
  });

  it('sets cancellationReason to null when no reason is given', async () => {
    const { service, prisma } = await createService();
    arrangeWin(prisma);
    await service.cancelPayment('p1', 'admin_1');
    const data = prisma.payment.updateMany.mock.calls[0][0].data;
    expect(data.cancellationReason).toBeNull();
    expect(data.note).toBeUndefined();
  });

  it('(b) reports a conflict when the payment is already CANCELLED', async () => {
    const { service, prisma } = await createService();
    arrangeLoss(prisma, { status: PaymentStatus.CANCELLED });

    // 409 rather than the old 400: losing a race is a conflict, not bad input.
    await expect(service.cancelPayment('p1', 'admin_1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('(b) rejects cancelling a REFUNDED payment', async () => {
    const { service, prisma } = await createService();
    arrangeLoss(prisma, { status: PaymentStatus.REFUNDED });

    await expect(service.cancelPayment('p1', 'admin_1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('404s an unknown payment (flip matches nothing, re-read finds no row)', async () => {
    const { service, prisma } = await createService();
    // No pre-read guard anymore: the conditional flip runs, matches 0 rows, and
    // the re-read returns null → 404.
    arrangeLoss(prisma, null);
    await expect(
      service.cancelPayment('nope', 'admin_1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.payment.updateMany).toHaveBeenCalledTimes(1);
  });

  it('404s when the row disappears between the flip and the re-read', async () => {
    const { service, prisma } = await createService();
    arrangeLoss(prisma, null);
    await expect(service.cancelPayment('p1', 'admin_1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('never writes on the losing side of a concurrent cancel', async () => {
    // The loser's updateMany matches 0 rows, so the winner's audit stamp and
    // note survive untouched — the whole point of M1.
    const { service, prisma } = await createService();
    arrangeLoss(prisma, { status: PaymentStatus.CANCELLED });

    await expect(service.cancelPayment('p1', 'admin_2')).rejects.toThrow();

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.payment.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('PaymentsService — cancelled excluded from booking balance', () => {
  it('(c) the paid-sum aggregate filters status = PAID (so CANCELLED drops out)', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findUnique.mockResolvedValue({ agreedPriceCents: 10000 });
    prisma.payment.aggregate.mockResolvedValue({
      _sum: { grossCents: 5000, refundedAmountCents: null },
    });

    await service.getBookingBalance('br_1');

    expect(prisma.payment.aggregate.mock.calls[0][0].where.status).toBe(
      PaymentStatus.PAID,
    );
  });
});

describe('PaymentsService — cash paidAt sanity bounds (§8.3b)', () => {
  // Config default for PAYMENTS_GO_LIVE_DATE is 2026-07-22.
  const tattooCash = (paidAt?: string) => ({
    source: PaymentSource.TATTOO,
    grossCents: 12_000,
    bookingRequestId: 'br_1',
    ...(paidAt ? { paidAt } : {}),
  });

  it('rejects a paidAt in the future', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findUnique.mockResolvedValue({ id: 'br_1' });
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await expect(
      service.createCashPayment(tattooCash(future) as never, 'admin_1'),
    ).rejects.toThrow(/future/i);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a paidAt before go-live', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findUnique.mockResolvedValue({ id: 'br_1' });

    await expect(
      service.createCashPayment(
        tattooCash('2020-01-01T00:00:00.000Z') as never,
        'admin_1',
      ),
    ).rejects.toThrow(/go-live/i);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('records normally when paidAt is omitted (no bounds applied)', async () => {
    const { service, prisma } = await createService();
    // GUEST_TABLE avoids the tattoo over-payment balance lookup; the point here
    // is only that omitting paidAt skips the bounds check and records.
    prisma.guestArtistBooking.findUnique.mockResolvedValue({ id: 'gab_1' });

    const { payment } = await service.createCashPayment(
      {
        source: PaymentSource.GUEST_TABLE,
        grossCents: 12_000,
        guestArtistBookingId: 'gab_1',
      } as never,
      'admin_1',
    );

    expect(prisma.payment.create).toHaveBeenCalledTimes(1);
    expect(payment.source).toBe(PaymentSource.GUEST_TABLE);
  });
});
