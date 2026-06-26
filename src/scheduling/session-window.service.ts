import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  async assertNoArtistCollision(params: {
    artistId: string;
    scheduledDate: Date;
    startsAt: Date;
    endsAt: Date;
    excludeSessionId?: string;
  }): Promise<void> {
    const { artistId, scheduledDate, startsAt, endsAt, excludeSessionId } =
      params;

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

    const candidates = await this.prisma.tattooSession.findMany({
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
}
