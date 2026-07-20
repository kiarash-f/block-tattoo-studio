import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GuestBookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class GuestBookingExpiryService {
  private readonly logger = new Logger(GuestBookingExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  /** Runs every hour — expires bookings stuck in PENDING_PAYMENT for over 24 hours */
  @Cron('0 * * * *')
  async expireStaleBookings(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Select first so we know which Stripe sessions to kill; the conditional
    // updateMany below only flips rows still PENDING_PAYMENT, so a booking
    // confirmed between the two statements is left alone (its session is
    // filtered out again before expiry).
    const stale = await this.prisma.guestArtistBooking.findMany({
      where: {
        status: GuestBookingStatus.PENDING_PAYMENT,
        createdAt: { lt: cutoff },
      },
      select: { id: true, stripeSessionId: true },
    });
    if (stale.length === 0) return;

    const result = await this.prisma.guestArtistBooking.updateMany({
      where: {
        id: { in: stale.map((b) => b.id) },
        status: GuestBookingStatus.PENDING_PAYMENT,
      },
      data: { status: GuestBookingStatus.EXPIRED },
    });

    this.logger.log(
      `Expired ${result.count} stale PENDING_PAYMENT booking(s) older than 24 hours`,
    );

    // Kill the payment links so an expired booking can no longer be paid.
    // Stripe throws if a session is not 'open' anymore (already paid or
    // already expired) — that race is benign: if money actually arrived, the
    // webhook's EXPIRED-status branch reports it to Sentry.
    for (const booking of stale) {
      if (!booking.stripeSessionId) continue;
      try {
        await this.stripe.expireCheckoutSession(booking.stripeSessionId);
      } catch (err) {
        this.logger.warn(
          `Could not expire Stripe session ${booking.stripeSessionId} for booking ${booking.id} (likely already completed/expired)`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
}
