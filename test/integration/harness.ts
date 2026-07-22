import { PrismaClient } from '@prisma/client';

/**
 * Integration-test harness: these specs run against a REAL Postgres because
 * they exist to prove that advisory locks and unique constraints actually
 * serialize concurrent writers. A mocked Prisma cannot demonstrate that — it
 * would only confirm that the code calls the functions we wrote.
 *
 * Point TEST_DATABASE_URL at a throwaway database (see test/integration/README).
 * When it is unset the whole suite skips, so `npm test` and CI stay green
 * without Postgres.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/** `describeIntegration(...)` runs only when a test database is configured. */
export const describeIntegration = TEST_DATABASE_URL ? describe : describe.skip;

export function createTestPrisma(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: TEST_DATABASE_URL } },
  });
}

/**
 * Truncate everything the concurrency specs touch. CASCADE handles the FK web
 * (BookingRequest → TattooSession → Payment, etc.) so order doesn't matter.
 */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Payment",
      "TattooSession",
      "BookingRequest",
      "ConsultSlot",
      "Client",
      "Artist",
      "AdminUser",
      "GuestArtistBooking",
      "StationConfig"
    RESTART IDENTITY CASCADE
  `);
}

/**
 * A rendezvous for N parties: every caller blocks until the last one arrives.
 *
 * Used ONLY by the "control" tests that reproduce the original bug. Those need
 * a guaranteed interleaving (all readers read before any writer writes) to show
 * the unguarded pattern overbooks every run rather than occasionally.
 *
 * The tests of the FIXED code deliberately do not use this: a barrier would
 * deadlock against a real lock (the holder would wait for a party that is
 * itself blocked on the lock), and the fix's correctness must not depend on a
 * particular interleaving anyway.
 */
export function createBarrier(parties: number): () => Promise<void> {
  let arrived = 0;
  let release: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return async () => {
    arrived += 1;
    if (arrived >= parties) release!();
    await gate;
  };
}

/** ISO yyyy-mm-dd for `daysFromNow` days ahead — keeps fixtures in the future. */
export function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

/** Count how many of a settled batch fulfilled / rejected. */
export function tally(results: PromiseSettledResult<unknown>[]): {
  fulfilled: number;
  rejected: number;
  reasons: string[];
} {
  return {
    fulfilled: results.filter((r) => r.status === 'fulfilled').length,
    rejected: results.filter((r) => r.status === 'rejected').length,
    reasons: results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => String(r.reason?.message ?? r.reason)),
  };
}
