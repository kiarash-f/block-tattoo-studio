import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GuestBookingStatus, PaymentSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { StationConfigService } from '../station-config/station-config.service';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto';
import { UpdateGuestBookingDto } from './dto/update-guest-booking.dto';
import { ListGuestBookingsQueryDto } from './dto/list-guest-bookings.query.dto';
import {
  LockNamespace,
  acquireNamespaceLock,
} from '../common/db/advisory-lock';

// Statuses that count against availability
const ACTIVE_STATUSES: GuestBookingStatus[] = [
  GuestBookingStatus.PENDING_PAYMENT,
  GuestBookingStatus.CONFIRMED,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a YYYY-MM-DD string into a UTC-midnight Date (avoids tz shift) */
function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Number of days from startDate to endDate inclusive */
function countDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/** Iterate every date in the range (inclusive) as UTC-midnight Dates */
function* eachDay(start: Date, end: Date): Generator<Date> {
  const cur = new Date(start);
  while (cur <= end) {
    yield new Date(cur);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

@Injectable()
export class GuestArtistBookingsService {
  private readonly logger = new Logger(GuestArtistBookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly configSvc: StationConfigService,
    private readonly config: ConfigService,
  ) {}

  // ─── Availability ──────────────────────────────────────────────────────────

  async getAvailability(startDateStr: string, endDateStr: string) {
    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const config = await this.configSvc.get();

    const overlapping = await this.prisma.guestArtistBooking.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
        archivedAt: null, // archived (soft-deleted) bookings free their tables
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { startDate: true, endDate: true, numberOfTables: true },
    });

    const bookedMap = new Map<string, number>();
    for (const b of overlapping) {
      for (const day of eachDay(b.startDate, b.endDate)) {
        const key = day.toISOString().slice(0, 10);
        bookedMap.set(key, (bookedMap.get(key) ?? 0) + b.numberOfTables);
      }
    }

    const days: {
      date: string;
      totalTables: number;
      bookedTables: number;
      availableTables: number;
    }[] = [];

    for (const day of eachDay(startDate, endDate)) {
      const key = day.toISOString().slice(0, 10);
      const booked = bookedMap.get(key) ?? 0;
      days.push({
        date: key,
        totalTables: config.totalTables,
        bookedTables: booked,
        availableTables: Math.max(0, config.totalTables - booked),
      });
    }

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      pricePerDayCents: config.pricePerDayCents,
      monthlyDiscountPercent: config.monthlyDiscountPercent,
      days,
    };
  }

  // ─── Availability invariant ────────────────────────────────────────────────

  /**
   * Throw unless every day in [startDate, endDate] can absorb `numberOfTables`
   * more. Shared by create and admin update so the two can't drift.
   *
   * MUST run inside a transaction that already holds the guest-table advisory
   * lock: on its own this is a read, and a read cannot make a check-then-write
   * atomic. The lock is what turns it into a real guard (C3).
   *
   * `excludeBookingId` drops the row being edited from the tally — its current
   * footprint is being replaced by the one under test, so counting both would
   * make a booking collide with its own former self.
   */
  private async assertTablesAvailable(
    tx: Prisma.TransactionClient,
    params: {
      startDate: Date;
      endDate: Date;
      numberOfTables: number;
      totalTables: number;
      excludeBookingId?: string;
    },
  ): Promise<void> {
    const {
      startDate,
      endDate,
      numberOfTables,
      totalTables,
      excludeBookingId,
    } = params;

    const overlapping = await tx.guestArtistBooking.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
        archivedAt: null, // archived (soft-deleted) bookings free their tables
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: { startDate: true, endDate: true, numberOfTables: true },
    });

    const bookedMap = new Map<string, number>();
    for (const b of overlapping) {
      for (const day of eachDay(b.startDate, b.endDate)) {
        const key = day.toISOString().slice(0, 10);
        bookedMap.set(key, (bookedMap.get(key) ?? 0) + b.numberOfTables);
      }
    }

    for (const day of eachDay(startDate, endDate)) {
      const key = day.toISOString().slice(0, 10);
      const already = bookedMap.get(key) ?? 0;
      if (already + numberOfTables > totalTables) {
        throw new BadRequestException(
          `Not enough tables available on ${key}. ` +
            `Available: ${totalTables - already}, requested: ${numberOfTables}.`,
        );
      }
    }
  }

  // ─── Create booking (public) ───────────────────────────────────────────────

  async create(dto: CreateGuestBookingDto) {
    if (!dto.acknowledgment) {
      throw new BadRequestException('You must acknowledge the booking terms.');
    }

    const startDate = parseDate(dto.startDate);
    const endDate = parseDate(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    const config = await this.configSvc.get();

    // ── Pricing ───────────────────────────────────────────────────────────────
    // Integer cents throughout; the discount multiplication is the single
    // point where a fraction can appear, so it is the single rounding point.
    const numberOfDays = countDays(startDate, endDate);
    const applyDiscount = numberOfDays >= 30;
    const discountPercent = applyDiscount ? config.monthlyDiscountPercent : 0;
    const baseCents =
      config.pricePerDayCents * dto.numberOfTables * numberOfDays;
    const totalPriceCents = Math.round(baseCents * (1 - discountPercent / 100));

    // ── Availability check + booking creation in a single transaction ─────────
    // The lock comes FIRST: without it two concurrent requests both read the
    // same "tables free" state at READ COMMITTED, both pass, and both insert —
    // overbooking the studio (C3). Holding it across the check and the insert
    // makes the pair atomic; it releases on commit/rollback.
    const booking = await this.prisma.$transaction(async (tx) => {
      await acquireNamespaceLock(tx, LockNamespace.GUEST_TABLE_AVAILABILITY);

      await this.assertTablesAvailable(tx, {
        startDate,
        endDate,
        numberOfTables: dto.numberOfTables,
        totalTables: config.totalTables,
      });

      return tx.guestArtistBooking.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          startDate,
          endDate,
          numberOfTables: dto.numberOfTables,
          totalPriceCents,
          discountApplied: discountPercent,
          acknowledgment: dto.acknowledgment,
          status: GuestBookingStatus.PENDING_PAYMENT,
        },
      });
    });

    // ── Create Stripe checkout session ───────────────────────────────────────
    // Reproduces the previous guest-artist session exactly (same product name,
    // description, amount, currency and return URLs); only the metadata is now
    // generic (payment_source / target_id / vat_rate_bps) for the shared webhook.
    const baseUrl = this.config.getOrThrow<string>('PUBLIC_BASE_URL');
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const { sessionId, paymentUrl } = await this.stripe.createCheckoutSession({
      paymentSource: PaymentSource.GUEST_TABLE,
      targetId: booking.id,
      vatRateBps: this.config.get<number>('VAT_RATE_BPS', 1900),
      amountCents: totalPriceCents,
      email: dto.email,
      productName: 'Guest Artist Table Booking',
      productDescription:
        `${dto.numberOfTables} table(s) · ${numberOfDays} day(s) · ` +
        `${fmt(startDate)} to ${fmt(endDate)}`,
      successUrl: `${baseUrl}/guest-booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/guest-booking/cancelled`,
    });

    // ── Attach Stripe IDs to the booking ─────────────────────────────────────
    const updatedBooking = await this.prisma.guestArtistBooking.update({
      where: { id: booking.id },
      data: {
        stripeSessionId: sessionId,
        stripePaymentUrl: paymentUrl,
      },
    });

    // Confirmation email is sent by the webhook handler once payment is confirmed.

    return {
      booking: updatedBooking,
      stripePaymentUrl: paymentUrl,
    };
  }

  // ─── Admin: list ──────────────────────────────────────────────────────────

  async list(query: ListGuestBookingsQueryDto) {
    // Archived (soft-deleted) bookings are excluded from the active admin list.
    const where: Prisma.GuestArtistBookingWhereInput = { archivedAt: null };

    if (query.status) where.status = query.status;

    if (query.from || query.to) {
      if (query.from) where.endDate = { gte: parseDate(query.from) };
      if (query.to)
        where.startDate = {
          ...(where.startDate as Prisma.DateTimeFilter | undefined),
          lte: parseDate(query.to),
        };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.guestArtistBooking.count({ where }),
      this.prisma.guestArtistBooking.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  // ─── Admin: detail ────────────────────────────────────────────────────────

  async detail(id: string) {
    const booking = await this.prisma.guestArtistBooking.findUnique({
      where: { id },
    });
    // Archived bookings read as gone from the admin API.
    if (!booking || booking.archivedAt) {
      throw new NotFoundException('Guest booking not found');
    }
    return booking;
  }

  // ─── Admin: update ────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateGuestBookingDto) {
    const existing = await this.prisma.guestArtistBooking.findUnique({
      where: { id },
      select: { id: true, archivedAt: true },
    });
    if (!existing || existing.archivedAt) {
      throw new NotFoundException('Guest booking not found');
    }

    const config = await this.configSvc.get();

    // Same lock as create(), for the same reason: an admin edit that grows a
    // booking races against public creates, and previously did not check
    // availability at all (C3). The row is re-read INSIDE the lock so the
    // fields the edit merges into (dates, table count, status) can't have been
    // moved by a concurrent write between the read and the check.
    return this.prisma.$transaction(async (tx) => {
      await acquireNamespaceLock(tx, LockNamespace.GUEST_TABLE_AVAILABILITY);

      const current = await tx.guestArtistBooking.findUnique({ where: { id } });
      if (!current || current.archivedAt) {
        throw new NotFoundException('Guest booking not found');
      }

      const needsRecalc =
        dto.startDate !== undefined ||
        dto.endDate !== undefined ||
        dto.numberOfTables !== undefined;

      const startDate = dto.startDate
        ? parseDate(dto.startDate)
        : current.startDate;
      const endDate = dto.endDate ? parseDate(dto.endDate) : current.endDate;
      const numberOfTables = dto.numberOfTables ?? current.numberOfTables;

      if (endDate < startDate) {
        throw new BadRequestException('endDate must be on or after startDate');
      }

      let totalPriceCents = current.totalPriceCents;
      let discountApplied = current.discountApplied;

      if (needsRecalc) {
        const numberOfDays = countDays(startDate, endDate);
        const applyDiscount = numberOfDays >= 30;
        const discountPercent = applyDiscount
          ? config.monthlyDiscountPercent
          : 0;
        discountApplied = discountPercent;
        const baseCents =
          config.pricePerDayCents * numberOfTables * numberOfDays;
        totalPriceCents = Math.round(baseCents * (1 - discountPercent / 100));
      }

      // The booking's capacity footprint changes when its dates/table count
      // move, and also when a status change makes a previously-inactive booking
      // start consuming tables again (e.g. EXPIRED → CONFIRMED).
      const nextStatus = dto.status ?? current.status;
      const willConsumeCapacity = ACTIVE_STATUSES.includes(nextStatus);
      const footprintChanged =
        needsRecalc || !ACTIVE_STATUSES.includes(current.status);

      if (willConsumeCapacity && footprintChanged) {
        await this.assertTablesAvailable(tx, {
          startDate,
          endDate,
          numberOfTables,
          totalTables: config.totalTables,
          excludeBookingId: id,
        });
      }

      return tx.guestArtistBooking.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.startDate !== undefined ? { startDate } : {}),
          ...(dto.endDate !== undefined ? { endDate } : {}),
          ...(dto.numberOfTables !== undefined ? { numberOfTables } : {}),
          ...(needsRecalc ? { totalPriceCents, discountApplied } : {}),
        },
      });
    });
  }

  // ─── Admin: delete ────────────────────────────────────────────────────────

  /**
   * GoBD (§8.3): soft-delete. A guest booking can be the target of a Payment, so
   * it is archived (archivedAt stamped), never hard-deleted — the row stays for
   * financial context and every active view filters archivedAt = null. Already-
   * archived bookings 404 so a double-delete is a clean no-op. An idempotent
   * timestamp: re-archiving does not move the original archive time.
   */
  async remove(id: string) {
    const existing = await this.prisma.guestArtistBooking.findUnique({
      where: { id },
      select: { id: true, archivedAt: true },
    });
    if (!existing || existing.archivedAt) {
      throw new NotFoundException('Guest booking not found');
    }
    return this.prisma.guestArtistBooking.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }
}
