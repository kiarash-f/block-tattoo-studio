import { ConfigService } from '@nestjs/config';
import { GuestBookingStatus, PrismaClient } from '@prisma/client';
import { GuestArtistBookingsService } from '../../src/guest-artist-bookings/guest-artist-bookings.service';
import { StationConfigService } from '../../src/station-config/station-config.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { StripeService } from '../../src/stripe/stripe.service';
import {
  createBarrier,
  createTestPrisma,
  describeIntegration,
  futureDate,
  resetDb,
  tally,
} from './harness';

/**
 * C3 — guest-table availability must be concurrency-safe.
 *
 * The studio has a fixed number of tables; the invariant is that on any day the
 * sum of booked tables never exceeds totalTables. It is an aggregate over
 * overlapping date ranges, so no DB constraint enforces it — the guard is an
 * advisory lock held across the check and the insert.
 */
describeIntegration('C3 — guest-table overbooking race', () => {
  const TOTAL_TABLES = 3;
  const START = futureDate(10);
  const END = futureDate(12);

  let prisma: PrismaClient;
  let service: GuestArtistBookingsService;

  /** Stripe is called only AFTER the transaction commits, so a stub is enough. */
  const stripeStub = {
    createCheckoutSession: jest.fn(async () => ({
      sessionId: `cs_test_${Math.random().toString(36).slice(2)}`,
      paymentUrl: 'https://stripe.test/checkout',
    })),
  } as unknown as StripeService;

  const configStub = {
    get: jest.fn((_k: string, d?: unknown) => d),
    getOrThrow: jest.fn(() => 'https://studio.test'),
  } as unknown as ConfigService;

  beforeAll(() => {
    prisma = createTestPrisma();
    const prismaSvc = prisma as unknown as PrismaService;
    service = new GuestArtistBookingsService(
      prismaSvc,
      stripeStub,
      new StationConfigService(prismaSvc),
      configStub,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await prisma.stationConfig.create({
      data: {
        totalTables: TOTAL_TABLES,
        pricePerDayCents: 5000,
        monthlyDiscountPercent: 10,
      },
    });
  });

  function bookingDto(numberOfTables: number, email: string) {
    return {
      name: 'Race Tester',
      phone: '+49 000 000',
      email,
      startDate: START,
      endDate: END,
      numberOfTables,
      acknowledgment: true,
    };
  }

  /** Booked tables on the first day of the contested range. */
  async function bookedOnFirstDay(): Promise<number> {
    const rows = await prisma.guestArtistBooking.findMany({
      where: {
        status: {
          in: [
            GuestBookingStatus.PENDING_PAYMENT,
            GuestBookingStatus.CONFIRMED,
          ],
        },
      },
      select: { numberOfTables: true },
    });
    return rows.reduce((sum, r) => sum + r.numberOfTables, 0);
  }

  it('CONTROL: the unguarded check-then-insert really does overbook', async () => {
    // Reproduces the pre-fix code path: same transaction, same query, but no
    // advisory lock. The barrier forces the interleaving that the old code
    // permitted, so this fails loudly if the harness ever stops exercising the
    // race — without it, a passing "fixed" test below could be vacuous.
    const barrier = createBarrier(2);

    const unguardedCreate = (tables: number) =>
      prisma.$transaction(async (tx) => {
        const overlapping = await tx.guestArtistBooking.findMany({
          where: {
            status: {
              in: [
                GuestBookingStatus.PENDING_PAYMENT,
                GuestBookingStatus.CONFIRMED,
              ],
            },
            startDate: { lte: new Date(END) },
            endDate: { gte: new Date(START) },
          },
          select: { numberOfTables: true },
        });
        const booked = overlapping.reduce((s, b) => s + b.numberOfTables, 0);

        await barrier(); // both readers have now read the same "free" state

        if (booked + tables > TOTAL_TABLES) throw new Error('would overbook');
        return tx.guestArtistBooking.create({
          data: {
            name: 'Control',
            phone: '+49 000 000',
            email: `control-${tables}@test.dev`,
            startDate: new Date(START),
            endDate: new Date(END),
            numberOfTables: tables,
            totalPriceCents: 1000,
            discountApplied: 0,
            acknowledgment: true,
            status: GuestBookingStatus.PENDING_PAYMENT,
          },
        });
      });

    const results = await Promise.allSettled([
      unguardedCreate(2),
      unguardedCreate(2),
    ]);

    expect(tally(results).fulfilled).toBe(2);
    // 4 tables sold against a capacity of 3 — the C3 bug, demonstrated.
    expect(await bookedOnFirstDay()).toBe(4);
  });

  it('two parallel creates for the last tables cannot exceed capacity', async () => {
    // Each asks for 2 of 3 tables: they fit individually, never together.
    const results = await Promise.allSettled([
      service.create(bookingDto(2, 'racer-a@test.dev')),
      service.create(bookingDto(2, 'racer-b@test.dev')),
    ]);

    const { fulfilled, rejected, reasons } = tally(results);
    expect(fulfilled).toBe(1);
    expect(rejected).toBe(1);
    expect(reasons[0]).toMatch(/Not enough tables available/);
    expect(await bookedOnFirstDay()).toBe(2);
  });

  it('holds under a wider burst of simultaneous single-table requests', async () => {
    // 8 racers for 3 tables: exactly 3 may win, no matter the interleaving.
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        service.create(bookingDto(1, `burst-${i}@test.dev`)),
      ),
    );

    expect(tally(results).fulfilled).toBe(TOTAL_TABLES);
    expect(await bookedOnFirstDay()).toBe(TOTAL_TABLES);
  });

  it('admin update cannot grow a booking past capacity (previously unchecked)', async () => {
    // Fill 2 of 3 tables with an untouched booking...
    await prisma.guestArtistBooking.create({
      data: {
        name: 'Existing',
        phone: '+49 000 000',
        email: 'existing@test.dev',
        startDate: new Date(START),
        endDate: new Date(END),
        numberOfTables: 2,
        totalPriceCents: 1000,
        discountApplied: 0,
        acknowledgment: true,
        status: GuestBookingStatus.CONFIRMED,
      },
    });
    // ...and a 1-table booking the admin will try to widen to 3.
    const { booking } = await service.create(bookingDto(1, 'editme@test.dev'));

    await expect(
      service.update(booking.id, { numberOfTables: 3 }),
    ).rejects.toThrow(/Not enough tables available/);

    expect(await bookedOnFirstDay()).toBe(3);
  });

  it('admin update may keep a booking the same size (no self-collision)', async () => {
    // The booking's own tables must not be counted against it, or any edit to a
    // fully-booked range would fail.
    const { booking } = await service.create(
      bookingDto(3, 'fullsize@test.dev'),
    );

    const updated = await service.update(booking.id, { name: 'Renamed' });

    expect(updated.name).toBe('Renamed');
    expect(updated.numberOfTables).toBe(3);
  });

  it('parallel admin update and public create contend on the same lock', async () => {
    const { booking } = await service.create(bookingDto(1, 'grow@test.dev'));

    // Both want the 2 remaining tables; the lock lets exactly one have them.
    const results = await Promise.allSettled([
      service.update(booking.id, { numberOfTables: 3 }),
      service.create(bookingDto(2, 'contender@test.dev')),
    ]);

    expect(tally(results).fulfilled).toBe(1);
    expect(await bookedOnFirstDay()).toBeLessThanOrEqual(TOTAL_TABLES);
  });
});
