import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  BookingType,
  BudgetRange,
  PaymentSource,
  PaymentStatus,
  PrismaClient,
} from '@prisma/client';
import { PaymentsService } from '../../src/payments/payments.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  createTestPrisma,
  describeIntegration,
  resetDb,
  tally,
} from './harness';

/**
 * M1 — cancelPayment must be atomic (the audit trail has to name the admin who
 * actually cancelled, and the reason must not be appended twice).
 * M2 — a repeated cash submission must not create a second PAID row.
 */
describeIntegration('M1/M2 — payment concurrency', () => {
  let prisma: PrismaClient;
  let payments: PaymentsService;
  let bookingRequestId: string;
  let adminA: string;
  let adminB: string;

  const configStub = {
    get: jest.fn((key: string, d?: unknown) =>
      key === 'VAT_RATE_BPS' ? 1900 : d,
    ),
  } as unknown as ConfigService;

  beforeAll(() => {
    prisma = createTestPrisma();
    payments = new PaymentsService(
      prisma as unknown as PrismaService,
      configStub,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    const client = await prisma.client.create({
      data: { firstName: 'Pay', lastName: 'Tester' },
    });
    const booking = await prisma.bookingRequest.create({
      data: {
        clientId: client.id,
        status: BookingStatus.TATTOO_SCHEDULED,
        bookingType: BookingType.WALK_IN,
        description: 'payment race',
        budgetRange: BudgetRange.UNDER_200,
        studioChooses: false,
        agreedPriceCents: 50_000,
      },
    });
    bookingRequestId = booking.id;

    const [a, b] = await Promise.all([
      prisma.adminUser.create({
        data: {
          email: `admin-a-${Date.now()}@test.dev`,
          passwordHash: 'x',
          displayName: 'Admin A',
        },
      }),
      prisma.adminUser.create({
        data: {
          email: `admin-b-${Date.now()}@test.dev`,
          passwordHash: 'x',
          displayName: 'Admin B',
        },
      }),
    ]);
    adminA = a.id;
    adminB = b.id;
  });

  function cashDto(overrides: Record<string, unknown> = {}) {
    return {
      source: PaymentSource.TATTOO,
      grossCents: 12_000,
      bookingRequestId,
      ...overrides,
    } as never;
  }

  // ─── M1 ────────────────────────────────────────────────────────────────────

  describe('cancelPayment', () => {
    async function paidPayment(note?: string) {
      const { payment } = await payments.createCashPayment(
        cashDto({ note }),
        adminA,
      );
      return payment;
    }

    it('two concurrent cancels: one wins, the other reports a conflict', async () => {
      const payment = await paidPayment();

      const results = await Promise.allSettled([
        payments.cancelPayment(payment.id, adminA, 'duplicate charge'),
        payments.cancelPayment(payment.id, adminB, 'customer complained'),
      ]);

      const { fulfilled, rejected, reasons } = tally(results);
      expect(fulfilled).toBe(1);
      expect(rejected).toBe(1);
      expect(reasons[0]).toMatch(/already cancelled/i);
    });

    it('the winner owns the audit trail; the loser cannot overwrite it', async () => {
      const payment = await paidPayment();

      await Promise.allSettled([
        payments.cancelPayment(payment.id, adminA, 'reason A'),
        payments.cancelPayment(payment.id, adminB, 'reason B'),
      ]);

      const row = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      expect(row.status).toBe(PaymentStatus.CANCELLED);
      // Exactly one admin, and it is one of the two that tried.
      expect([adminA, adminB]).toContain(row.cancelledByAdminId);
      // Exactly one reason recorded — not both appended.
      const appended = (row.note ?? '').match(/Cancelled:/g) ?? [];
      expect(appended).toHaveLength(1);
    });

    it('a cancelled payment stops counting toward the booking balance', async () => {
      const payment = await paidPayment();
      expect(await payments.sumPaidCentsForBooking(bookingRequestId)).toBe(
        12_000,
      );

      await payments.cancelPayment(payment.id, adminA, 'void');

      expect(await payments.sumPaidCentsForBooking(bookingRequestId)).toBe(0);
    });

    it('preserves an existing note when appending the cancellation reason', async () => {
      const payment = await paidPayment('deposit in cash');

      const cancelled = await payments.cancelPayment(
        payment.id,
        adminA,
        'wrong amount',
      );

      expect(cancelled.note).toBe('deposit in cash | Cancelled: wrong amount');
    });

    it('rejects an unknown payment id as not found', async () => {
      await expect(
        payments.cancelPayment('pay_does_not_exist', adminA),
      ).rejects.toThrow(/not found/i);
    });
  });

  // ─── M2 ────────────────────────────────────────────────────────────────────

  describe('cash payment idempotency', () => {
    it('a double submit with one key creates exactly one payment', async () => {
      const key = 'idem-double-click';

      const first = await payments.createCashPayment(
        cashDto({ idempotencyKey: key }),
        adminA,
      );
      const second = await payments.createCashPayment(
        cashDto({ idempotencyKey: key }),
        adminA,
      );

      expect(second.payment.id).toBe(first.payment.id);
      expect(second.idempotentReplay).toBe(true);
      expect(first.idempotentReplay).toBe(false);
      expect(await prisma.payment.count()).toBe(1);
    });

    it('two simultaneous submits with one key create exactly one payment', async () => {
      const key = 'idem-parallel';

      const results = await Promise.allSettled([
        payments.createCashPayment(cashDto({ idempotencyKey: key }), adminA),
        payments.createCashPayment(cashDto({ idempotencyKey: key }), adminA),
      ]);

      // Neither call errors — the loser adopts the winner's row.
      expect(tally(results).fulfilled).toBe(2);
      expect(await prisma.payment.count()).toBe(1);
      // And revenue reflects one payment, not two.
      expect(await payments.sumPaidCentsForBooking(bookingRequestId)).toBe(
        12_000,
      );
    });

    it('distinct keys record distinct payments', async () => {
      await payments.createCashPayment(
        cashDto({ idempotencyKey: 'key-1' }),
        adminA,
      );
      await payments.createCashPayment(
        cashDto({ idempotencyKey: 'key-2' }),
        adminA,
      );

      expect(await prisma.payment.count()).toBe(2);
    });

    it('omitting the key preserves today behaviour (no dedupe)', async () => {
      // Opt-in by design: a client that sends no key is unconstrained, which is
      // what keeps the migration safe for existing callers.
      await payments.createCashPayment(cashDto(), adminA);
      await payments.createCashPayment(cashDto(), adminA);

      expect(await prisma.payment.count()).toBe(2);
    });

    it('a replay returns the original amount, not the retried one', async () => {
      const key = 'idem-amount-drift';
      const first = await payments.createCashPayment(
        cashDto({ idempotencyKey: key, grossCents: 10_000 }),
        adminA,
      );

      // Same key, different amount: the key identifies the intent, so the
      // stored payment wins and no second row appears.
      const replay = await payments.createCashPayment(
        cashDto({ idempotencyKey: key, grossCents: 99_000 }),
        adminB,
      );

      expect(replay.payment.id).toBe(first.payment.id);
      expect(replay.payment.grossCents).toBe(10_000);
      expect(await prisma.payment.count()).toBe(1);
    });
  });
});
