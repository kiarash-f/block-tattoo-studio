import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { GuestBookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { StationConfigService } from '../station-config/station-config.service';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto';
import { UpdateGuestBookingDto } from './dto/update-guest-booking.dto';
import { ListGuestBookingsQueryDto } from './dto/list-guest-bookings.query.dto';

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
      pricePerDay: config.pricePerDay,
      monthlyDiscountPercent: config.monthlyDiscountPercent,
      days,
    };
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
    const numberOfDays = countDays(startDate, endDate);
    const applyDiscount = numberOfDays >= 30;
    const discountPercent = applyDiscount ? config.monthlyDiscountPercent : 0;
    const multiplier = 1 - discountPercent / 100;
    const totalPrice = parseFloat(
      (
        config.pricePerDay *
        dto.numberOfTables *
        numberOfDays *
        multiplier
      ).toFixed(2),
    );

    // ── Availability check + booking creation in a single transaction ─────────
    const booking = await this.prisma.$transaction(async (tx) => {
      const overlapping = await tx.guestArtistBooking.findMany({
        where: {
          status: { in: ACTIVE_STATUSES },
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

      for (const day of eachDay(startDate, endDate)) {
        const key = day.toISOString().slice(0, 10);
        const already = bookedMap.get(key) ?? 0;
        if (already + dto.numberOfTables > config.totalTables) {
          throw new BadRequestException(
            `Not enough tables available on ${key}. ` +
              `Available: ${config.totalTables - already}, requested: ${dto.numberOfTables}.`,
          );
        }
      }

      return tx.guestArtistBooking.create({
        data: {
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          startDate,
          endDate,
          numberOfTables: dto.numberOfTables,
          totalPrice,
          discountApplied: discountPercent,
          acknowledgment: dto.acknowledgment,
          status: GuestBookingStatus.PENDING_PAYMENT,
        },
      });
    });

    // ── Create Stripe checkout session ───────────────────────────────────────
    const { sessionId, paymentUrl } = await this.stripe.createCheckoutSession({
      guestName: dto.name,
      email: dto.email,
      totalPrice,
      bookingId: booking.id,
      numberOfTables: dto.numberOfTables,
      numberOfDays,
      startDate,
      endDate,
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
    const where: Prisma.GuestArtistBookingWhereInput = {};

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
    if (!booking) throw new NotFoundException('Guest booking not found');
    return booking;
  }

  // ─── Admin: update ────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateGuestBookingDto) {
    const existing = await this.prisma.guestArtistBooking.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Guest booking not found');

    const needsRecalc =
      dto.startDate !== undefined ||
      dto.endDate !== undefined ||
      dto.numberOfTables !== undefined;

    const startDate = dto.startDate
      ? parseDate(dto.startDate)
      : existing.startDate;
    const endDate = dto.endDate ? parseDate(dto.endDate) : existing.endDate;
    const numberOfTables = dto.numberOfTables ?? existing.numberOfTables;

    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    let totalPrice = existing.totalPrice;
    let discountApplied = existing.discountApplied;

    if (needsRecalc) {
      const config = await this.configSvc.get();
      const numberOfDays = countDays(startDate, endDate);
      const applyDiscount = numberOfDays >= 30;
      const discountPercent = applyDiscount ? config.monthlyDiscountPercent : 0;
      discountApplied = discountPercent;
      totalPrice = parseFloat(
        (
          config.pricePerDay *
          numberOfTables *
          numberOfDays *
          (1 - discountPercent / 100)
        ).toFixed(2),
      );
    }

    return this.prisma.guestArtistBooking.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.startDate !== undefined ? { startDate } : {}),
        ...(dto.endDate !== undefined ? { endDate } : {}),
        ...(dto.numberOfTables !== undefined ? { numberOfTables } : {}),
        ...(needsRecalc ? { totalPrice, discountApplied } : {}),
      },
    });
  }

  // ─── Admin: delete ────────────────────────────────────────────────────────

  async remove(id: string) {
    const existing = await this.prisma.guestArtistBooking.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Guest booking not found');
    return this.prisma.guestArtistBooking.delete({ where: { id } });
  }
}
