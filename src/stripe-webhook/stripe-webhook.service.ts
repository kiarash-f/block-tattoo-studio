import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GuestBookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly stripe: StripeService,
  ) {}

  async handlePaymentWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ received: true }> {
    // ── Signature verification ────────────────────────────────────────────────
    const secret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    let event: ReturnType<StripeService['constructWebhookEvent']>;
    try {
      event = this.stripe.constructWebhookEvent(rawBody, signature, secret);
    } catch {
      this.logger.warn('Stripe webhook signature verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // ── Only handle checkout.session.completed ────────────────────────────────
    if (event.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const session = event.data.object as {
      id: string;
      metadata?: Record<string, string> | null;
    };

    // ── Extract booking ID from metadata ──────────────────────────────────────
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      this.logger.warn(
        `Stripe webhook: checkout.session.completed has no booking_id metadata (session: ${session.id})`,
      );
      return { received: true };
    }

    // ── Load booking — idempotency guard ─────────────────────────────────────
    const booking = await this.prisma.guestArtistBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(
        `Stripe webhook: booking ${bookingId} not found — skipping`,
      );
      return { received: true };
    }

    if (booking.status !== GuestBookingStatus.PENDING_PAYMENT) {
      this.logger.log(
        `Stripe webhook: booking ${bookingId} already in status ${booking.status} — skipping`,
      );
      return { received: true };
    }

    // ── Confirm booking ───────────────────────────────────────────────────────
    await this.prisma.guestArtistBooking.update({
      where: { id: bookingId },
      data: { status: GuestBookingStatus.CONFIRMED },
    });

    this.logger.log(`Booking ${bookingId} confirmed via Stripe webhook`);

    // ── Send confirmation email ───────────────────────────────────────────────
    const numberOfDays =
      Math.round(
        (booking.endDate.getTime() - booking.startDate.getTime()) / 86_400_000,
      ) + 1;

    this.email
      .sendGuestArtistBookingConfirmation({
        to:              booking.email,
        artistName:      booking.name,
        startDate:       booking.startDate,
        endDate:         booking.endDate,
        numberOfTables:  booking.numberOfTables,
        numberOfDays,
        totalPrice:      booking.totalPrice,
        discountPercent: booking.discountApplied,
      })
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to send confirmation email for booking ${bookingId}`,
          err,
        ),
      );

    return { received: true };
  }
}
