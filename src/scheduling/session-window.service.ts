import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LockNamespace, acquireEntityLock } from '../common/db/advisory-lock';

export interface ValidatedWindow {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Shared scheduling unit used by BOTH entry points (schedule-tattoo, walk-in)
 * and the session-edit path, so they can't diverge in how they place a session
 * in time:
 *   1. parseWindow      — validate a REQUIRED clock-time window
 *   2. assertNoArtistCollision — hard-block per-artist same-day overlaps
 */
@Injectable()
export class SessionWindowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse + validate a tattoo session's time window. Mirrors the rules proven in
   * BookingAssignment.parseAndValidateTimeRange (NaN guard, endsAt after
   * startsAt) — but a *scheduled tattoo* must have a full window, so unlike
   * assignments BOTH ends are required here.
   */
  parseWindow(
    startsAt?: string | null,
    endsAt?: string | null,
  ): ValidatedWindow {
    if (!startsAt || !endsAt) {
      throw new BadRequestException(
        'Both startsAt and endsAt are required to schedule a session',
      );
    }
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid startsAt');
    }
    const end = new Date(endsAt);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid endsAt');
    }
    if (end <= start) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    return { startsAt: start, endsAt: end };
  }

  /** Pure half-open overlap test: [aStart,aEnd) intersects [bStart,bEnd). */
  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
    return aStart < bEnd && aEnd > bStart;
  }

  /**
   * Hard-block when the artist already holds an OCCUPYING session on the same
   * calendar day whose window overlaps [startsAt, endsAt). Overlap is
   * per-artist: two different artists may hold the same window — only the same
   * artistId cannot be double-booked.
   *
   * "Occupying" = the booking is neither CANCELLED nor COMPLETED, the session
   * isn't individually completed (completedAt null), and it actually has a
   * window (startsAt/endsAt non-null). This is what makes a cancelled booking's
   * stale session, completed work, and pre-feature windowless rows NOT block.
   *
   * `excludeSessionId` lets the edit path skip the row being moved.
   */
  async assertNoArtistCollision(
    params: {
      artistId: string;
      scheduledDate: Date;
      startsAt: Date;
      endsAt: Date;
      excludeSessionId?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const { artistId, scheduledDate, startsAt, endsAt, excludeSessionId } =
      params;
    const db = tx ?? this.prisma;

    // Candidate scope: same artist, same UTC calendar day (uses the
    // [artistId, scheduledDate] index). Precise overlap is tested below.
    const dayStart = new Date(
      Date.UTC(
        scheduledDate.getUTCFullYear(),
        scheduledDate.getUTCMonth(),
        scheduledDate.getUTCDate(),
      ),
    );
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);

    const where: Prisma.TattooSessionWhereInput = {
      artistId,
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      completedAt: null,
      startsAt: { not: null },
      endsAt: { not: null },
      scheduledDate: { gte: dayStart, lt: dayEnd },
      bookingRequest: {
        status: {
          notIn: [BookingStatus.CANCELLED, BookingStatus.COMPLETED],
        },
      },
    };

    const candidates = await db.tattooSession.findMany({
      where,
      select: { id: true, startsAt: true, endsAt: true },
    });

    const conflict = candidates.find(
      (c) =>
        c.startsAt != null &&
        c.endsAt != null &&
        this.overlaps(startsAt, endsAt, c.startsAt, c.endsAt),
    );

    if (conflict) {
      throw new BadRequestException(
        `Artist is already booked from ${conflict.startsAt!.toISOString()} ` +
          `to ${conflict.endsAt!.toISOString()} on this day — overlapping window`,
      );
    }
  }

  /**
   * Race-safe form of the collision check, and the one every write path must
   * use: takes the artist's advisory lock, then runs the check on the same
   * transaction that will insert the session (H1).
   *
   * Previously the check ran before the transaction, so two concurrent
   * schedule/walk-in/edit calls for one artist both passed and both inserted
   * overlapping windows. Serializing per artist (rather than globally) is
   * enough because the invariant is per-artist — two artists never contend.
   *
   * Lock the artist whose schedule is being written to. On a move between
   * artists that is the destination: vacating the origin can't create an
   * overlap, so it needs no lock.
   *
   * Deliberately NOT a DB exclusion constraint: whether a session occupies its
   * window depends on the parent booking's status (a cancelled booking's stale
   * session must not block), which lives in another table and so is invisible
   * to any EXCLUDE ... USING gist predicate.
   */
  async lockArtistAndAssertNoCollision(
    tx: Prisma.TransactionClient,
    params: {
      artistId: string;
      scheduledDate: Date;
      startsAt: Date;
      endsAt: Date;
      excludeSessionId?: string;
    },
  ): Promise<void> {
    await acquireEntityLock(tx, LockNamespace.ARTIST_SCHEDULE, params.artistId);
    await this.assertNoArtistCollision(params, tx);
  }
}
