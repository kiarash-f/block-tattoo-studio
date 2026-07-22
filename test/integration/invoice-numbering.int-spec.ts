import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  BookingType,
  BudgetRange,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { PaymentsService } from '../../src/payments/payments.service';
import { InvoiceService } from '../../src/payments/invoice.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  createTestPrisma,
  describeIntegration,
  resetDb,
} from './harness';

/**
 * §8.2 — the invoice number must be GAP-FREE even under concurrent payments and
 * transaction rollbacks. A mocked Prisma cannot prove this; only a real Postgres
 * exercising the InvoiceCounter row lock can. Point TEST_DATABASE_URL at a
 * throwaway DB (see test/integration/README); the suite skips otherwise.
 */
describeIntegration('§8.2 — gap-free invoice numbering', () => {
  let prisma: PrismaClient;
  let payments: PaymentsService;
  let bookingRequestId: string;
  let adminId: string;

  const configStub = {
    get: jest.fn((key: string, d?: unknown) =>
      key === 'VAT_RATE_BPS' ? 1900 : d,
    ),
  } as unknown as ConfigService;

  beforeAll(() => {
    prisma = createTestPrisma();
    const invoices = new InvoiceService(
      prisma as unknown as PrismaService,
      configStub,
    );
    payments = new PaymentsService(
      prisma as unknown as PrismaService,
      configStub,
      invoices,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    const client = await prisma.client.create({
      data: { firstName: 'Inv', lastName: 'Tester' },
    });
    const booking = await prisma.bookingRequest.create({
      data: {
        clientId: client.id,
        status: BookingStatus.TATTOO_SCHEDULED,
        bookingType: BookingType.WALK_IN,
        description: 'invoice numbering',
        budgetRange: BudgetRange.UNDER_200,
        studioChooses: false,
        agreedPriceCents: 1_000_000, // high so over-payment never blocks
      },
    });
    bookingRequestId = booking.id;
    const admin = await prisma.adminUser.create({
      data: {
        email: `admin-inv-${Date.now()}@test.dev`,
        passwordHash: 'x',
        displayName: 'Admin Inv',
      },
    });
    adminId = admin.id;
  });

  const cashDto = (grossCents: number) =>
    ({
      source: 'TATTOO',
      grossCents,
      bookingRequestId,
    }) as never;

  const currentYear = new Date().getFullYear();

  it('every PAID payment gets exactly one invoice, snapshotting its amounts', async () => {
    const { payment } = await payments.createCashPayment(cashDto(12_345), adminId);

    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { paymentId: payment.id },
    });
    expect(invoice.grossCents).toBe(12_345);
    expect(invoice.netCents + invoice.vatAmountCents).toBe(12_345);
    expect(invoice.number).toBe(1);
    expect(invoice.formattedNumber).toBe(`${invoice.year}-000001`);
  });

  it('concurrent payments produce a contiguous, gap-free, unique sequence', async () => {
    const N = 12;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        payments.createCashPayment(cashDto(1_000 + i), adminId),
      ),
    );

    const invoices = await prisma.invoice.findMany({
      orderBy: { number: 'asc' },
      select: { number: true, year: true, formattedNumber: true },
    });

    expect(invoices).toHaveLength(N);
    // Contiguous 1..N — no number skipped, none repeated.
    expect(invoices.map((i) => i.number)).toEqual(
      Array.from({ length: N }, (_, i) => i + 1),
    );
    // All this year, and the display id matches the number.
    for (const inv of invoices) {
      expect(inv.formattedNumber).toBe(
        `${inv.year}-${String(inv.number).padStart(6, '0')}`,
      );
    }
  });

  it('a rolled-back payment returns its number to the pool (no gap)', async () => {
    // 1) A real payment takes number 1.
    const first = await payments.createCashPayment(cashDto(5_000), adminId);
    const inv1 = await prisma.invoice.findUniqueOrThrow({
      where: { paymentId: first.payment.id },
    });
    expect(inv1.number).toBe(1);

    // 2) A transaction that allocates the NEXT number (2) then rolls back. The
    //    ON CONFLICT DO UPDATE increment is undone with the transaction, so 2 is
    //    returned to the pool rather than being burned.
    await expect(
      prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ lastNumber: number }[]>(Prisma.sql`
          INSERT INTO "InvoiceCounter" ("year", "lastNumber", "updatedAt")
          VALUES (${currentYear}, 1, NOW())
          ON CONFLICT ("year")
          DO UPDATE SET "lastNumber" = "InvoiceCounter"."lastNumber" + 1,
                        "updatedAt" = NOW()
          RETURNING "lastNumber";
        `);
        expect(Number(rows[0].lastNumber)).toBe(2); // allocated inside the tx
        throw new Error('force rollback');
      }),
    ).rejects.toThrow(/force rollback/);

    // 3) The next real payment must get 2 (reused), NOT 3 — proving no gap.
    const third = await payments.createCashPayment(cashDto(6_000), adminId);
    const inv3 = await prisma.invoice.findUniqueOrThrow({
      where: { paymentId: third.payment.id },
    });
    expect(inv3.number).toBe(2);
  });
});
