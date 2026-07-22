import { Prisma } from '@prisma/client';

/**
 * Transaction-scoped Postgres advisory locks — the serialization primitive
 * behind the two "check then insert" invariants that no constraint can express:
 *
 *  - GUEST_TABLE_AVAILABILITY (C3): per-day SUM(numberOfTables) <= totalTables
 *    is an aggregate over overlapping date ranges, not a pairwise overlap, so a
 *    GiST exclusion constraint cannot enforce it without one row per table.
 *  - ARTIST_SCHEDULE (H1): windows must not overlap per artist, but whether a
 *    session *occupies* time depends on its parent booking's status — a
 *    cross-table predicate a constraint cannot see.
 *
 * Both therefore stay app-enforced, and the lock is what makes the app check
 * trustworthy under concurrency: readers of the invariant take the same lock as
 * writers, so a check-then-write pair is atomic against other holders.
 *
 * `pg_advisory_xact_lock` releases at COMMIT/ROLLBACK with no explicit unlock,
 * which is why it is safe behind a connection pooler and cannot leak a lock on
 * a thrown request. It MUST be called inside an interactive transaction — on a
 * pooled connection outside one, the lock would release at an arbitrary later
 * point (or never).
 *
 * The two-argument form namespaces keys: (classid, objid). Distinct namespaces
 * never collide, so the guest-table lock and the artist lock are independent.
 */
export enum LockNamespace {
  /** Global across all guest-table bookings — the invariant spans date ranges. */
  GUEST_TABLE_AVAILABILITY = 1,
  /** Keyed per artist — different artists schedule concurrently. */
  ARTIST_SCHEDULE = 2,
}

/**
 * Take a namespace-wide lock (no per-entity key). Blocks until granted.
 *
 * Serializes every holder of the namespace. Correct for guest-table
 * availability, where any two bookings can contend through overlapping days:
 * a per-date key would need one lock per day in the range, and two ranges
 * acquiring shared days in different orders would deadlock.
 */
export async function acquireNamespaceLock(
  tx: Prisma.TransactionClient,
  namespace: LockNamespace,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${namespace}::int, 0::int)`;
}

/**
 * Take a lock on one entity within a namespace. Blocks until granted.
 *
 * `hashtext` maps the id to the int4 the lock API takes. A hash collision
 * between two ids costs one needless serialization, never a missed lock — the
 * only failure mode is harmless.
 */
export async function acquireEntityLock(
  tx: Prisma.TransactionClient,
  namespace: LockNamespace,
  entityId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${namespace}::int, hashtext(${entityId}))`;
}
