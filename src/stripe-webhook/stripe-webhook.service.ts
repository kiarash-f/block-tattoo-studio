import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ConfigService } from '@nestjs/config';
import {
  GuestBookingStatus,
  PaymentMethod,
  PaymentSource,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { StripeService } from '../stripe/stripe.service';
import { PaymentsService } from '../payments/payments.service';

/** Minimal shape we read off a checkout.session.completed event. */
interface CheckoutSession {
  id: string;
  amount_total: number | null;
  payment_intent?: string | { id: string } | null;
  metadata?: Record<string, string> | null;
}

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly stripe: StripeService,
    private readonly payments: PaymentsService,
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

    const session = event.data.object as CheckoutSession;

    // ── Resolve routing from metadata ─────────────────────────────────────────
    // New sessions carry { payment_source, target_id, vat_rate_bps }.
    // Legacy shim: pre-cutover guest-artist sessions only had { booking_id }.
    const meta = session.metadata ?? {};
    let paymentSource: PaymentSource | undefined;
    let targetId: string | undefined;
    let vatRateBps: number | undefined;

    if (meta.payment_source) {
      paymentSource = meta.payment_source as PaymentSource;
      targetId = meta.target_id;
      vatRateBps = meta.vat_rate_bps ? Number(meta.vat_rate_bps) : undefined;
    } else if (meta.booking_id) {
      // Legacy guest-artist session — route as GUEST_TABLE.
      paymentSource = PaymentSource.GUEST_TABLE;
      targetId = meta.booking_id;
    }

    if (!paymentSource || !targetId) {
      this.logger.warn(
        `Stripe webhook: session ${session.id} has no routing metadata — skipping`,
      );
      return { received: true };
    }

    // ── Universal idempotency guard ───────────────────────────────────────────
    // If we already recorded a Payment for this session, this is a redelivery.
    const existingPayment = await this.prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
      select: { id: true },
    });
    if (existingPayment) {
      this.logger.log(
        `Stripe webhook: payment already recorded for session ${session.id} — skipping`,
      );
      return { received: true };
    }

    const amountCents = session.amount_total;
    if (amountCents == null) {
      this.logger.warn(
        `Stripe webhook: session ${session.id} has no amount_total — skipping`,
      );
      return { received: true };
    }

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? undefined);

    // ── Route by source ───────────────────────────────────────────────────────
    switch (paymentSource) {
      case PaymentSource.GUEST_TABLE:
        await this.handleGuestTable(
          targetId,
          session.id,
          amountCents,
          paymentIntentId,
          vatRateBps,
        );
        break;

      case PaymentSource.TATTOO:
        // Stub: side effects (status transitions, emails) come later.
        // For now, just record the Payment row.
        await this.recordLinkPayment({
          source: PaymentSource.TATTOO,
          targetId,
          amountCents,
          sessionId: session.id,
          paymentIntentId,
          vatRateBps,
        });
        break;

      case PaymentSource.VOUCHER:
        // Stub: voucher sales don't exist yet. recordPayment will reject this
        // (no voucherSaleId seam), so this branch is effectively unreachable
        // until the voucher work lands.
        await this.recordLinkPayment({
          source: PaymentSource.VOUCHER,
          targetId,
          amountCents,
          sessionId: session.id,
          paymentIntentId,
          vatRateBps,
        });
        break;

      default:
        this.logger.warn(
          `Stripe webhook: unknown payment_source "${String(paymentSource)}" for session ${session.id}`,
        );
    }

    return { received: true };
  }

  // ─── GUEST_TABLE: existing confirm + email flow, unchanged, + Payment row ────

  private async handleGuestTable(
    bookingId: string,
    sessionId: string,
    amountCents: number,
    paymentIntentId: string | undefined,
    vatRateBps: number | undefined,
  ): Promise<void> {
    // ── Load booking — idempotency guard ─────────────────────────────────────
    const booking = await this.prisma.guestArtistBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(
        `Stripe webhook: booking ${bookingId} not found — skipping`,
      );
      return;
    }

    if (booking.status !== GuestBookingStatus.PENDING_PAYMENT) {
      this.logger.log(
        `Stripe webhook: booking ${bookingId} already in status ${booking.status} — skipping`,
      );
      return;
    }

    // ── Confirm booking + record Payment ──────────────────────────────────────
    // Validate the charged amount against the booking total before writing.
    const expectedCents = Math.round(booking.totalPrice * 100);

    if (amountCents === expectedCents) {
      // Atomic: a DB failure can't leave a CONFIRMED booking with no Payment row.
      await this.prisma.$transaction(async (tx) => {
        await tx.guestArtistBooking.update({
          where: { id: bookingId },
          data: { status: GuestBookingStatus.CONFIRMED },
        });
        await this.recordLinkPayment(
          {
            source: PaymentSource.GUEST_TABLE,
            targetId: bookingId,
            amountCents,
            sessionId,
            paymentIntentId,
            vatRateBps,
          },
          tx,
        );
      });
    } else {
      // Amount mismatch: preserve the customer-observable outcome (confirm +
      // email) but skip the Payment write. Report to Sentry so a skipped
      // revenue row is never invisible.
      await this.prisma.guestArtistBooking.update({
        where: { id: bookingId },
        data: { status: GuestBookingStatus.CONFIRMED },
      });

      Sentry.captureException(
        new Error(
          'Stripe webhook: checkout amount does not match expected total — Payment skipped',
        ),
        {
          level: 'error',
          tags: { area: 'payments', payment_source: PaymentSource.GUEST_TABLE },
          extra: {
            sessionId,
            expectedCents,
            actualCents: amountCents,
            target: {
              type: PaymentSource.GUEST_TABLE,
              guestArtistBookingId: bookingId,
            },
            outcome: 'booking confirmed + email sent; Payment NOT recorded',
          },
        },
      );

      this.logger.error(
        `Stripe webhook: amount mismatch for booking ${bookingId} ` +
          `(stripe=${amountCents}, expected=${expectedCents}) — booking confirmed, Payment NOT recorded`,
      );
    }

    this.logger.log(`Booking ${bookingId} confirmed via Stripe webhook`);

    // ── Send confirmation email ───────────────────────────────────────────────
    // Fire-and-forget AFTER the transaction commits — a mail failure must never
    // roll back a real payment.
    const numberOfDays =
      Math.round(
        (booking.endDate.getTime() - booking.startDate.getTime()) / 86_400_000,
      ) + 1;

    this.email
      .sendGuestArtistBookingConfirmation({
        to: booking.email,
        artistName: booking.name,
        startDate: booking.startDate,
        endDate: booking.endDate,
        numberOfTables: booking.numberOfTables,
        numberOfDays,
        totalPrice: booking.totalPrice,
        discountPercent: booking.discountApplied,
      })
      .catch((err: unknown) =>
        this.logger.error(
          `Failed to send confirmation email for booking ${bookingId}`,
          err,
        ),
      );
  }

  // ─── Shared LINK payment writer (maps source → the correct target FK) ────────

  private async recordLinkPayment(
    params: {
      source: PaymentSource;
      targetId: string;
      amountCents: number;
      sessionId: string;
      paymentIntentId?: string;
      vatRateBps?: number;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const { source, targetId, amountCents, sessionId, paymentIntentId, vatRateBps } =
      params;

    await this.payments.recordPayment(
      {
        source,
        method: PaymentMethod.LINK,
        grossCents: amountCents,
        vatRateBps,
        stripeSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        bookingRequestId:
          source === PaymentSource.TATTOO ? targetId : undefined,
        guestArtistBookingId:
          source === PaymentSource.GUEST_TABLE ? targetId : undefined,
      },
      tx,
    );
  }
}
