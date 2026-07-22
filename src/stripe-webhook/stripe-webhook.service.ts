import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { ConfigService } from '@nestjs/config';
import {
  GuestBookingStatus,
  PaymentMethod,
  PaymentSource,
  Prisma,
  VoucherStatus,
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

    // ── Process, but never bounce a verified event back to Stripe ─────────────
    // The event is immutable: if it is unprocessable now (malformed metadata,
    // unexpected handler throw), it will be unprocessable on every retry too.
    // Returning non-2xx would make Stripe retry for days; instead we report
    // loudly and ack. (Signature failures above still return 401.)
    try {
      await this.processCheckoutSession(session);
    } catch (err) {
      this.logger.error(
        `Stripe webhook: unhandled error processing session ${session.id} — acking to stop retries`,
        err instanceof Error ? err.stack : err,
      );
      Sentry.captureException(err, {
        level: 'error',
        tags: { area: 'payments', webhook: 'stripe' },
        extra: {
          sessionId: session.id,
          eventType: event.type,
          metadata: session.metadata,
          amountCents: session.amount_total,
          outcome:
            'event acked with 200; NO Payment recorded — manual replay needed',
        },
      });
    }

    return { received: true };
  }

  private async processCheckoutSession(
    session: CheckoutSession,
  ): Promise<void> {
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
      this.reportMoneyWithoutPayment({
        message:
          'Stripe webhook: completed session has no routing metadata — Payment skipped',
        sessionId: session.id,
        amountCents: session.amount_total,
        extra: { metadata: session.metadata },
      });
      return;
    }

    // ── Universal idempotency guard ───────────────────────────────────────────
    // If we already recorded a Payment for this session, this is a redelivery.
    const existingPayment = await this.prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
      select: { id: true },
    });
    if (existingPayment) {
      // Normal redelivery — the money IS recorded, so no Sentry here.
      this.logger.log(
        `Stripe webhook: payment already recorded for session ${session.id} — skipping`,
      );
      return;
    }

    const amountCents = session.amount_total;
    if (amountCents == null) {
      this.logger.warn(
        `Stripe webhook: session ${session.id} has no amount_total — skipping`,
      );
      this.reportMoneyWithoutPayment({
        message:
          'Stripe webhook: completed session has no amount_total — Payment skipped',
        sessionId: session.id,
        paymentSource,
        targetId,
        amountCents: null,
      });
      return;
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
        await this.handleVoucher(
          targetId,
          session.id,
          amountCents,
          paymentIntentId,
          vatRateBps,
        );
        break;

      default:
        this.logger.warn(
          `Stripe webhook: unknown payment_source "${String(paymentSource)}" for session ${session.id}`,
        );
        this.reportMoneyWithoutPayment({
          message:
            'Stripe webhook: unknown payment_source on completed session — Payment skipped',
          sessionId: session.id,
          paymentSource,
          targetId,
          amountCents,
        });
    }
  }

  /**
   * C2: a completed checkout means Stripe took the customer's money. Any branch
   * that then declines to write a Payment row must escalate — a silent skip is
   * unaccounted revenue that nobody would ever notice.
   */
  private reportMoneyWithoutPayment(params: {
    message: string;
    sessionId: string;
    paymentSource?: PaymentSource;
    targetId?: string;
    amountCents?: number | null;
    extra?: Record<string, unknown>;
  }): void {
    const { message, sessionId, paymentSource, targetId, amountCents, extra } =
      params;
    Sentry.captureException(new Error(message), {
      level: 'error',
      tags: {
        area: 'payments',
        ...(paymentSource ? { payment_source: paymentSource } : {}),
      },
      extra: {
        sessionId,
        paymentSource,
        targetId,
        amountCents,
        outcome: 'money received; Payment NOT recorded',
        ...extra,
      },
    });
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
      this.reportMoneyWithoutPayment({
        message:
          'Stripe webhook: paid session references a missing guest booking — Payment skipped',
        sessionId,
        paymentSource: PaymentSource.GUEST_TABLE,
        targetId: bookingId,
        amountCents,
      });
      return;
    }

    if (booking.status !== GuestBookingStatus.PENDING_PAYMENT) {
      // Realistic on the expiry race: the cron expired the booking, then the
      // customer's payment (made before the session died) arrives here.
      this.logger.warn(
        `Stripe webhook: booking ${bookingId} already in status ${booking.status} — skipping`,
      );
      this.reportMoneyWithoutPayment({
        message: `Stripe webhook: guest booking is ${booking.status}, not PENDING_PAYMENT — Payment skipped`,
        sessionId,
        paymentSource: PaymentSource.GUEST_TABLE,
        targetId: bookingId,
        amountCents,
        extra: { bookingStatus: booking.status },
      });
      return;
    }

    // ── Confirm booking + record Payment ──────────────────────────────────────
    // Validate the charged amount against the booking total before writing.
    const expectedCents = booking.totalPriceCents;

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
        totalPriceCents: booking.totalPriceCents,
        discountPercent: booking.discountApplied,
      })
      .catch((err: unknown) => {
        this.logger.error(
          `Failed to send confirmation email for booking ${bookingId}`,
          err,
        );
        Sentry.captureException(err, {
          level: 'error',
          tags: { area: 'email', payment_source: PaymentSource.GUEST_TABLE },
          extra: {
            guestArtistBookingId: bookingId,
            outcome:
              'booking confirmed + Payment recorded; confirmation email NOT delivered',
          },
        });
      });
  }

  // ─── VOUCHER: activate the sale + record Payment, then email the code ────────

  private async handleVoucher(
    voucherSaleId: string,
    sessionId: string,
    amountCents: number,
    paymentIntentId: string | undefined,
    vatRateBps: number | undefined,
  ): Promise<void> {
    // ── Load sale — idempotency guard ─────────────────────────────────────────
    const sale = await this.prisma.voucherSale.findUnique({
      where: { id: voucherSaleId },
      include: { product: { select: { name: true } } },
    });

    if (!sale) {
      this.logger.warn(
        `Stripe webhook: voucher sale ${voucherSaleId} not found — skipping`,
      );
      this.reportMoneyWithoutPayment({
        message:
          'Stripe webhook: paid session references a missing voucher sale — Payment skipped',
        sessionId,
        paymentSource: PaymentSource.VOUCHER,
        targetId: voucherSaleId,
        amountCents,
      });
      return;
    }

    if (sale.status !== VoucherStatus.PENDING_PAYMENT) {
      this.logger.warn(
        `Stripe webhook: voucher sale ${voucherSaleId} already in status ${sale.status} — skipping`,
      );
      this.reportMoneyWithoutPayment({
        message: `Stripe webhook: voucher sale is ${sale.status}, not PENDING_PAYMENT — Payment skipped`,
        sessionId,
        paymentSource: PaymentSource.VOUCHER,
        targetId: voucherSaleId,
        amountCents,
        extra: { saleStatus: sale.status },
      });
      return;
    }

    // ── Validate the charged amount against the frozen gross ──────────────────
    const expectedCents = sale.grossCents;

    if (amountCents !== expectedCents) {
      // Divergence from the guest flow: a voucher is STORED VALUE. We must NOT
      // activate (or email) a voucher whose paid amount doesn't match its face
      // value — that would issue redeemable value we weren't paid for. Leave the
      // sale PENDING_PAYMENT, write no Payment, and report for manual handling.
      Sentry.captureException(
        new Error(
          'Stripe webhook: voucher checkout amount does not match face value — sale NOT activated',
        ),
        {
          level: 'error',
          tags: { area: 'payments', payment_source: PaymentSource.VOUCHER },
          extra: {
            sessionId,
            expectedCents,
            actualCents: amountCents,
            target: { type: PaymentSource.VOUCHER, voucherSaleId },
            outcome:
              'sale left PENDING_PAYMENT; Payment NOT recorded; no email',
          },
        },
      );
      this.logger.error(
        `Stripe webhook: amount mismatch for voucher ${voucherSaleId} ` +
          `(stripe=${amountCents}, expected=${expectedCents}) — sale NOT activated`,
      );
      return;
    }

    // ── Activate sale + record Payment atomically ─────────────────────────────
    // A DB failure can't leave a VALID voucher with no Payment row.
    await this.prisma.$transaction(async (tx) => {
      await tx.voucherSale.update({
        where: { id: voucherSaleId },
        data: { status: VoucherStatus.VALID },
      });
      await this.recordLinkPayment(
        {
          source: PaymentSource.VOUCHER,
          targetId: voucherSaleId,
          amountCents,
          sessionId,
          paymentIntentId,
          vatRateBps,
        },
        tx,
      );
    });

    this.logger.log(
      `Voucher sale ${voucherSaleId} activated via Stripe webhook`,
    );

    // ── Send the voucher email ────────────────────────────────────────────────
    // Fire-and-forget AFTER commit — a mail failure must never roll back a real
    // payment or the activation.
    this.email
      .sendVoucherPurchase({
        to: sale.buyerEmail,
        buyerName: sale.buyerName,
        productName: sale.product.name,
        code: sale.code,
        grossCents: sale.grossCents,
        delivery: sale.delivery,
      })
      .catch((err: unknown) => {
        this.logger.error(
          `Failed to send voucher email for sale ${voucherSaleId}`,
          err,
        );
        // M5: the email is the ONLY delivery channel for the code — a failure
        // means the customer paid and got nothing. Escalate; an admin can
        // recover via POST /admin/vouchers/:code/resend-email.
        Sentry.captureException(err, {
          level: 'error',
          tags: { area: 'email', payment_source: PaymentSource.VOUCHER },
          extra: {
            voucherSaleId,
            outcome:
              'sale VALID + Payment recorded; voucher-code email NOT delivered — use the admin resend endpoint',
          },
        });
      });
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
    const {
      source,
      targetId,
      amountCents,
      sessionId,
      paymentIntentId,
      vatRateBps,
    } = params;

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
        voucherSaleId: source === PaymentSource.VOUCHER ? targetId : undefined,
      },
      tx,
    );
  }
}
