// Standalone mock-payment seeder for the admin payments page (list + revenue
// analytics). Dev-only; NOT wired into the main prisma seed.
//
// Run:      npx ts-node prisma/seed-payments.ts
// Cleanup:  every row this script creates is tagged so it can be deleted:
//   - Payment.note = 'mock-seed'
//   - VoucherSale.code starts with 'MOCK-SEED-'
//   - VoucherProduct / BookingRequest / Client names & descriptions contain
//     '[mock-seed]'
//
// What it creates:
//   1 Client -> 8 BookingRequests (payment targets, source = TATTOO)
//   1 VoucherProduct -> 1 VoucherSale per voucher payment (source = VOUCHER)
//   60 Payments spread over the last 120 days, ~48 PAID / 7 REFUNDED /
//   5 CANCELLED, methods LINK (Stripe) and CASH (CASH always PAID), amounts
//   8000..120000 cents with a 19% VAT split (netCents + vatAmountCents ==
//   grossCents). paidAt/createdAt are explicit so the revenue timeseries
//   (which buckets on paidAt) spans real history.

import 'dotenv/config';
import {
  BudgetRange,
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  PrismaClient,
  VoucherStatus,
  VoucherType,
} from '@prisma/client';

// ─── Production guard ─────────────────────────────────────────────────────────
// This script targets the local dev DB only. Refuse anything that looks like
// the Railway production database.

const BLOCKED_HOST_PATTERNS = ['railway.app', 'rlwy.net', 'railway.internal'];

function assertNotProduction(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    host = url.toLowerCase(); // unparseable URL: match against the raw string
  }

  const hit = BLOCKED_HOST_PATTERNS.find((p) => host.includes(p));
  if (hit) {
    console.error(
      `DATABASE_URL host looks like production (matched "${hit}"). ` +
        'This seeder is dev-only. Aborting.',
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('NODE_ENV is "production". This seeder is dev-only. Aborting.');
    process.exit(1);
  }
}

// ─── Deterministic PRNG (mulberry32) so re-runs produce the same shape ────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(0xb10c7a77);

function randInt(min: number, maxInclusive: number): number {
  return min + Math.floor(rng() * (maxInclusive - min + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Money ────────────────────────────────────────────────────────────────────

const VAT_RATE_BPS = 1900;

/** Whole-euro gross in [8000, 120000] cents. */
function randomGrossCents(): number {
  return randInt(80, 1200) * 100;
}

/** Invariant required by the schema: netCents + vatAmountCents == grossCents. */
function vatSplit(grossCents: number): { netCents: number; vatAmountCents: number } {
  const netCents = Math.round(grossCents / (1 + VAT_RATE_BPS / 10000));
  return { netCents, vatAmountCents: grossCents - netCents };
}

// ─── Dates ────────────────────────────────────────────────────────────────────

const DAYS_BACK = 120;

/** A timestamp on a random day within the last DAYS_BACK days, 10:00–19:59. */
function randomPaidAt(now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - randInt(0, DAYS_BACK - 1));
  d.setHours(randInt(10, 19), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

/** paidAt + 1..7 days, clamped to now (for refundedAt / cancelledAt). */
function shortlyAfter(paidAt: Date, now: Date): Date {
  const d = new Date(paidAt);
  d.setDate(d.getDate() + randInt(1, 7));
  return d > now ? now : d;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

const TOTAL = 60;
const REFUNDED_COUNT = 7;
const CANCELLED_COUNT = 5;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  assertNotProduction();

  const now = new Date();
  const runTs = Date.now(); // uniqueness namespace for codes / stripe ids

  // 1) Booking targets: one throwaway client, 8 booking requests.
  const client = await prisma.client.create({
    data: {
      firstName: 'Mock',
      lastName: 'Seedclient [mock-seed]',
      email: `mock-seed-${runTs}@example.com`,
    },
  });

  const budgetRanges = Object.values(BudgetRange);
  const bookings = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      prisma.bookingRequest.create({
        data: {
          clientId: client.id,
          description: `[mock-seed] payment-target booking #${i + 1} (safe to delete)`,
          budgetRange: pick(budgetRanges),
        },
      }),
    ),
  );

  // 2) Voucher product: one CUSTOM product (null price is valid for CUSTOM);
  //    individual sales are created per voucher payment below.
  const product = await prisma.voucherProduct.create({
    data: {
      type: VoucherType.CUSTOM,
      name: 'Gift Voucher [mock-seed]',
    },
  });

  // 3) Status plan: ~48 PAID / 7 REFUNDED / 5 CANCELLED, shuffled across rows.
  const statuses: PaymentStatus[] = shuffle([
    ...Array<PaymentStatus>(REFUNDED_COUNT).fill(PaymentStatus.REFUNDED),
    ...Array<PaymentStatus>(CANCELLED_COUNT).fill(PaymentStatus.CANCELLED),
    ...Array<PaymentStatus>(TOTAL - REFUNDED_COUNT - CANCELLED_COUNT).fill(
      PaymentStatus.PAID,
    ),
  ]);

  const counts = {
    byStatus: {} as Record<string, number>,
    byMethod: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
  };

  for (let i = 0; i < TOTAL; i++) {
    const status = statuses[i];

    // CASH is always PAID (a cash cancellation would be plausible, but keeping
    // non-PAID rows on LINK matches how the app produces them: REFUNDED comes
    // from Stripe webhooks). Roughly 30% of PAID rows are CASH.
    const method =
      status === PaymentStatus.PAID && rng() < 0.3
        ? PaymentMethod.CASH
        : PaymentMethod.LINK;

    // ~1/3 voucher sales, ~2/3 tattoo bookings.
    const isVoucher = rng() < 1 / 3;
    const source = isVoucher ? PaymentSource.VOUCHER : PaymentSource.TATTOO;

    const grossCents = randomGrossCents();
    const { netCents, vatAmountCents } = vatSplit(grossCents);
    const paidAt = randomPaidAt(now);

    // Voucher payments get their own sale row with a matching VAT split.
    let voucherSaleId: string | undefined;
    if (isVoucher) {
      const sale = await prisma.voucherSale.create({
        data: {
          code: `MOCK-SEED-${runTs}-${i}`,
          productId: product.id,
          status:
            status === PaymentStatus.PAID
              ? VoucherStatus.VALID
              : VoucherStatus.CANCELLED,
          buyerName: 'Mock Buyer [mock-seed]',
          buyerEmail: `mock-buyer-${runTs}-${i}@example.com`,
          grossCents,
          netCents,
          vatAmountCents,
          vatRateBps: VAT_RATE_BPS,
          createdAt: paidAt,
        },
      });
      voucherSaleId = sale.id;
    }

    await prisma.payment.create({
      data: {
        source,
        method,
        status,
        grossCents,
        netCents,
        vatAmountCents,
        vatRateBps: VAT_RATE_BPS,
        paidAt,
        createdAt: paidAt,
        bookingRequestId: isVoucher ? undefined : pick(bookings).id,
        voucherSaleId,
        stripeSessionId:
          method === PaymentMethod.LINK ? `cs_test_mock_${runTs}_${i}` : null,
        stripePaymentIntentId:
          method === PaymentMethod.LINK ? `pi_test_mock_${runTs}_${i}` : null,
        refundedAt:
          status === PaymentStatus.REFUNDED ? shortlyAfter(paidAt, now) : null,
        refundedAmountCents:
          status === PaymentStatus.REFUNDED ? grossCents : null,
        cancelledAt:
          status === PaymentStatus.CANCELLED ? shortlyAfter(paidAt, now) : null,
        note: 'mock-seed',
      },
    });

    counts.byStatus[status] = (counts.byStatus[status] ?? 0) + 1;
    counts.byMethod[method] = (counts.byMethod[method] ?? 0) + 1;
    counts.bySource[source] = (counts.bySource[source] ?? 0) + 1;
  }

  console.log(`Seeded ${TOTAL} mock payments over the last ${DAYS_BACK} days.`);
  console.log('  by status:', counts.byStatus);
  console.log('  by method:', counts.byMethod);
  console.log('  by source:', counts.bySource);
  console.log(
    `Targets: ${bookings.length} bookings (client ${client.id}), ` +
      `voucher product ${product.id}. All rows tagged mock-seed / [mock-seed].`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
