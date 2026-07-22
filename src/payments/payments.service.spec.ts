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
    // Execute the [count, findMany] tuple like a real interactive transaction.
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const config = {
    get: jest.fn((key: string, def?: unknown) =>
      key === 'VAT_RATE_BPS' ? defaultVatRateBps : def,
    ),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PaymentsService,
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
 * cancelPayment is now a conditional updateMany guarded on status = PAID (M1),
 * so these mocks drive `updateMany.count`: 1 = this call won the flip, 0 = it
 * lost (or the row was never PAID) and the service re-reads to explain why.
 */
describe('PaymentsService — cancelPayment', () => {
  /** Mock a payment that exists with `status`, and a flip that succeeds. */
  function arrangeWin(
    prisma: MockPrisma,
    row: { id?: string; status?: PaymentStatus; note?: string | null } = {},
  ) {
    const full = {
      id: 'p1',
      status: PaymentStatus.PAID,
      note: null,
      ...row,
    };
    prisma.payment.findUnique.mockResolvedValue(full);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findUniqueOrThrow.mockResolvedValue({
      ...full,
      status: PaymentStatus.CANCELLED,
    });
    return full;
  }

  /** Mock a flip that matched nothing, with `current` as the re-read state. */
  function arrangeLoss(
    prisma: MockPrisma,
    current: { status: PaymentStatus } | null,
  ) {
    prisma.payment.findUnique
      .mockResolvedValueOnce({ id: 'p1', note: null })
      .mockResolvedValueOnce(current);
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });
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
    expect(call.data.note).toBe('Cancelled: Refunded in cash');
    expect(res.status).toBe(PaymentStatus.CANCELLED);
  });

  it('appends the reason to an existing note', async () => {
    const { service, prisma } = await createService();
    arrangeWin(prisma, { note: 'cash at desk' });
    await service.cancelPayment('p1', 'admin_1', 'refunded');
    expect(prisma.payment.updateMany.mock.calls[0][0].data.note).toBe(
      'cash at desk | Cancelled: refunded',
    );
  });

  it('leaves the note unchanged when no reason is given', async () => {
    const { service, prisma } = await createService();
    arrangeWin(prisma, { note: 'cash' });
    await service.cancelPayment('p1', 'admin_1');
    expect(prisma.payment.updateMany.mock.calls[0][0].data.note).toBe('cash');
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

  it('404s an unknown payment', async () => {
    const { service, prisma } = await createService();
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(
      service.cancelPayment('nope', 'admin_1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
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
