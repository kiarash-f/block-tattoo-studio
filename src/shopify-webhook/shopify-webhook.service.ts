import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { GuestBookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ShopifyWebhookService {
  private readonly logger = new Logger(ShopifyWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async handlePaymentWebhook(
    rawBody: Buffer,
    hmacHeader: string,
  ): Promise<{ received: true }> {
    // ── HMAC verification ─────────────────────────────────────────────────────
    const secret = this.config.getOrThrow<string>('SHOPIFY_WEBHOOK_SECRET');
    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    if (computed !== hmacHeader) {
      this.logger.warn('Shopify webhook HMAC verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // ── Parse payload ─────────────────────────────────────────────────────────
    let payload: {
      note_attributes?: Array<{ name: string; value: string }>;
    };

    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      this.logger.warn('Shopify webhook payload is not valid JSON');
      return { received: true };
    }

    // ── Extract booking ID from note_attributes ───────────────────────────────
    const bookingIdAttr = (payload.note_attributes ?? []).find(
      (a) => a.name === 'booking_id',
    );

    if (!bookingIdAttr?.value) {
      this.logger.warn(
        'Shopify webhook received without booking_id note_attribute — skipping',
      );
      return { received: true };
    }

    const bookingId = bookingIdAttr.value;

    // ── Load booking — idempotency guard ─────────────────────────────────────
    const booking = await this.prisma.guestArtistBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(
        `Shopify webhook: booking ${bookingId} not found — skipping`,
      );
      return { received: true };
    }

    if (booking.status !== GuestBookingStatus.PENDING_PAYMENT) {
      this.logger.log(
        `Shopify webhook: booking ${bookingId} already in status ${booking.status} — skipping`,
      );
      return { received: true };
    }

    // ── Confirm booking ───────────────────────────────────────────────────────
    await this.prisma.guestArtistBooking.update({
      where: { id: bookingId },
      data: { status: GuestBookingStatus.CONFIRMED },
    });

    this.logger.log(`Booking ${bookingId} confirmed via Shopify webhook`);

    // ── Send confirmation email ───────────────────────────────────────────────
    const numberOfDays =
      Math.round(
        (booking.endDate.getTime() - booking.startDate.getTime()) / 86_400_000,
      ) + 1;

    this.email
      .sendGuestArtistBookingConfirmation({
        to:             booking.email,
        artistName:     booking.name,
        startDate:      booking.startDate,
        endDate:        booking.endDate,
        numberOfTables: booking.numberOfTables,
        numberOfDays,
        totalPrice:     booking.totalPrice,
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
