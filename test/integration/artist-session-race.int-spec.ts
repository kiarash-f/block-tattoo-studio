import {
  ArtistStatus,
  BookingStatus,
  BookingType,
  BudgetRange,
  PrismaClient,
} from '@prisma/client';
import { BookingsService } from '../../src/bookings/bookings.service';
import { SchedulingService } from '../../src/scheduling/scheduling.service';
import { SessionWindowService } from '../../src/scheduling/session-window.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EmailService } from '../../src/email/email.service';
import { MediaService } from '../../src/media/media.service';
import { PaymentsService } from '../../src/payments/payments.service';
import {
  createBarrier,
  createTestPrisma,
  describeIntegration,
  resetDb,
  tally,
} from './harness';

/**
 * H1 — an artist must never hold two overlapping sessions.
 *
 * The check used to run before the transaction that inserted the session, so
 * two concurrent schedule / walk-in / edit calls both passed it and both wrote.
 * It now runs inside the transaction under a per-artist advisory lock.
 */
describeIntegration('H1 — artist double-booking race', () => {
  let prisma: PrismaClient;
  let bookings: BookingsService;
  let scheduling: SchedulingService;
  let windowSvc: SessionWindowService;

  let artistId: string;
  let otherArtistId: string;
  let adminId: string;

  const DAY = new Date('2027-03-15T00:00:00.000Z');
  const WINDOW_A = {
    startsAt: '2027-03-15T10:00:00.000Z',
    endsAt: '2027-03-15T13:00:00.000Z',
  };
  // Overlaps WINDOW_A by an hour.
  const WINDOW_B = {
    startsAt: '2027-03-15T12:00:00.000Z',
    endsAt: '2027-03-15T15:00:00.000Z',
  };

  const emailStub = {
    sendSessionReminder: jest.fn(async () => undefined),
    sendBookingConfirmation: jest.fn(async () => undefined),
    sendConsultConfirmation: jest.fn(async () => undefined),
  } as unknown as EmailService;
  const mediaStub = { uploadBuffer: jest.fn() } as unknown as MediaService;
  const paymentsStub = {} as unknown as PaymentsService;

  beforeAll(() => {
    prisma = createTestPrisma();
    const prismaSvc = prisma as unknown as PrismaService;
    windowSvc = new SessionWindowService(prismaSvc);
    bookings = new BookingsService(
      prismaSvc,
      emailStub,
      mediaStub,
      paymentsStub,
      windowSvc,
    );
    scheduling = new SchedulingService(prismaSvc, emailStub, windowSvc);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    const [a, b] = await Promise.all([
      prisma.artist.create({
        data: {
          displayName: 'Race Artist',
          slug: `race-artist-${Date.now()}`,
          status: ArtistStatus.ACTIVE,
        },
      }),
      prisma.artist.create({
        data: {
          displayName: 'Other Artist',
          slug: `other-artist-${Date.now()}`,
          status: ArtistStatus.ACTIVE,
        },
      }),
    ]);
    artistId = a.id;
    otherArtistId = b.id;
    const admin = await prisma.adminUser.create({
      data: {
        email: `admin-${Date.now()}@test.dev`,
        passwordHash: 'x',
        displayName: 'Admin',
      },
    });
    adminId = admin.id;
  });

  /** A booking sitting at CONSULT_APPROVED, ready for scheduleTattooSession. */
  async function approvedBooking(): Promise<string> {
    const client = await prisma.client.create({
      data: { firstName: 'Race', lastName: 'Client' },
    });
    const booking = await prisma.bookingRequest.create({
      data: {
        clientId: client.id,
        status: BookingStatus.CONSULT_APPROVED,
        bookingType: BookingType.APPOINTMENT,
        description: 'race',
        budgetRange: BudgetRange.UNDER_200,
        studioChooses: false,
      },
    });
    return booking.id;
  }

  async function sessionCountFor(id: string): Promise<number> {
    return prisma.tattooSession.count({ where: { artistId: id } });
  }

  it('CONTROL: checking before the transaction really does double-book', async () => {
    // The pre-fix shape: check first, then open the transaction. The barrier
    // forces both to finish checking before either writes, which is exactly
    // what the old code allowed.
    const barrier = createBarrier(2);
    const bookingA = await approvedBooking();
    const bookingB = await approvedBooking();

    const unguardedSchedule = async (bookingId: string) => {
      await windowSvc.assertNoArtistCollision({
        artistId,
        scheduledDate: DAY,
        startsAt: new Date(WINDOW_A.startsAt),
        endsAt: new Date(WINDOW_A.endsAt),
      });
      await barrier();
      return prisma.tattooSession.create({
        data: {
          bookingRequestId: bookingId,
          artistId,
          scheduledDate: DAY,
          startsAt: new Date(WINDOW_A.startsAt),
          endsAt: new Date(WINDOW_A.endsAt),
        },
      });
    };

    const results = await Promise.allSettled([
      unguardedSchedule(bookingA),
      unguardedSchedule(bookingB),
    ]);

    expect(tally(results).fulfilled).toBe(2);
    // Two overlapping sessions for one artist — the H1 bug, demonstrated.
    expect(await sessionCountFor(artistId)).toBe(2);
  });

  it('parallel scheduleTattooSession calls yield exactly one session', async () => {
    const [bookingA, bookingB] = await Promise.all([
      approvedBooking(),
      approvedBooking(),
    ]);

    const results = await Promise.allSettled([
      bookings.scheduleTattooSession(bookingA, {
        scheduledDate: DAY,
        artistId,
        ...WINDOW_A,
      }),
      bookings.scheduleTattooSession(bookingB, {
        scheduledDate: DAY,
        artistId,
        ...WINDOW_B,
      }),
    ]);

    const { fulfilled, rejected, reasons } = tally(results);
    expect(fulfilled).toBe(1);
    expect(rejected).toBe(1);
    // The frontend already handles this 400 wording — it must not change.
    expect(reasons[0]).toMatch(
      /Artist is already booked from .* overlapping window/,
    );
    expect(await sessionCountFor(artistId)).toBe(1);
  });

  it('parallel walk-in and scheduled session contend on the same artist lock', async () => {
    const bookingA = await approvedBooking();

    const results = await Promise.allSettled([
      bookings.scheduleTattooSession(bookingA, {
        scheduledDate: DAY,
        artistId,
        ...WINDOW_A,
      }),
      bookings.createWalkIn(
        adminId,
        {
          client: { firstName: 'Walk', lastName: 'In' },
          description: 'walk-in race',
          tattooDate: DAY,
          artistId,
          ...WINDOW_B,
        },
        [],
      ),
    ]);

    expect(tally(results).fulfilled).toBe(1);
    expect(await sessionCountFor(artistId)).toBe(1);
  });

  it('a session edit cannot move onto an occupied window', async () => {
    const [bookingA, bookingB] = await Promise.all([
      approvedBooking(),
      approvedBooking(),
    ]);
    // One session at WINDOW_A, one parked on a different (non-overlapping) day.
    await bookings.scheduleTattooSession(bookingA, {
      scheduledDate: DAY,
      artistId,
      ...WINDOW_A,
    });
    const moving = await bookings.scheduleTattooSession(bookingB, {
      scheduledDate: DAY,
      artistId,
      startsAt: '2027-03-15T16:00:00.000Z',
      endsAt: '2027-03-15T18:00:00.000Z',
    });

    await expect(
      scheduling.updateTattooSession(moving.id, WINDOW_B),
    ).rejects.toThrow(/Artist is already booked/);
  });

  it('parallel edits racing for the same free window: only one lands', async () => {
    const [bookingA, bookingB] = await Promise.all([
      approvedBooking(),
      approvedBooking(),
    ]);
    const sessionA = await bookings.scheduleTattooSession(bookingA, {
      scheduledDate: DAY,
      artistId,
      startsAt: '2027-03-15T06:00:00.000Z',
      endsAt: '2027-03-15T07:00:00.000Z',
    });
    const sessionB = await bookings.scheduleTattooSession(bookingB, {
      scheduledDate: DAY,
      artistId,
      startsAt: '2027-03-15T20:00:00.000Z',
      endsAt: '2027-03-15T21:00:00.000Z',
    });

    // Both try to move into the same empty midday slot at once.
    const results = await Promise.allSettled([
      scheduling.updateTattooSession(sessionA.id, WINDOW_A),
      scheduling.updateTattooSession(sessionB.id, WINDOW_A),
    ]);

    expect(tally(results).fulfilled).toBe(1);

    const midday = await prisma.tattooSession.count({
      where: {
        artistId,
        startsAt: new Date(WINDOW_A.startsAt),
      },
    });
    expect(midday).toBe(1);
  });

  it('different artists are not serialized against each other', async () => {
    const [bookingA, bookingB] = await Promise.all([
      approvedBooking(),
      approvedBooking(),
    ]);

    // Identical windows, different artists — both must succeed. This is what
    // the per-artist lock key buys over a single global scheduling lock.
    const results = await Promise.allSettled([
      bookings.scheduleTattooSession(bookingA, {
        scheduledDate: DAY,
        artistId,
        ...WINDOW_A,
      }),
      bookings.scheduleTattooSession(bookingB, {
        scheduledDate: DAY,
        artistId: otherArtistId,
        ...WINDOW_A,
      }),
    ]);

    expect(tally(results).fulfilled).toBe(2);
    expect(await sessionCountFor(artistId)).toBe(1);
    expect(await sessionCountFor(otherArtistId)).toBe(1);
  });

  it("a cancelled booking's session still does not block scheduling", async () => {
    // The behaviour that rules out a DB exclusion constraint: occupancy depends
    // on the parent booking's status, which lives in another table.
    const cancelled = await approvedBooking();
    await bookings.scheduleTattooSession(cancelled, {
      scheduledDate: DAY,
      artistId,
      ...WINDOW_A,
    });
    await prisma.bookingRequest.update({
      where: { id: cancelled },
      data: { status: BookingStatus.CANCELLED },
    });

    const fresh = await approvedBooking();
    await expect(
      bookings.scheduleTattooSession(fresh, {
        scheduledDate: DAY,
        artistId,
        ...WINDOW_A,
      }),
    ).resolves.toBeDefined();
  });
});
