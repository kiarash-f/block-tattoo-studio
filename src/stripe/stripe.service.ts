import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentSource } from '@prisma/client';
import Stripe from 'stripe';

export interface CreateCheckoutSessionParams {
  /** Routing tag read back by the webhook to create the right Payment record. */
  paymentSource: PaymentSource;
  /** Id of the target record this payment is for (e.g. GuestArtistBooking id). */
  targetId: string;
  /** VAT rate (basis points) snapshotted into checkout metadata. */
  vatRateBps: number;
  /** Amount to charge, in integer cents. */
  amountCents: number;
  email: string;
  /** Stripe line-item product name. */
  productName: string;
  /** Optional Stripe line-item description. */
  productDescription?: string;
  /** Success redirect (include `{CHECKOUT_SESSION_ID}` if the page needs it). */
  successUrl: string;
  /** Cancel redirect. */
  cancelUrl: string;
}

// Every checkout session dies 23h after creation — 1h before the earliest
// possible guest-booking expiry (hourly cron, 24h cutoff), so a payment link
// can never outlive the capacity hold it pays for. Stripe allows 30min–24h.
const CHECKOUT_SESSION_TTL_MS = 23 * 60 * 60 * 1000;

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  // Let TypeScript infer the instance type from the constructor return
  private readonly client: ReturnType<typeof Stripe>;

  constructor(private readonly config: ConfigService) {
    this.client = new Stripe(
      this.config.getOrThrow<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2026-03-25.dahlia',
        maxNetworkRetries: 2,
        timeout: 15_000,
      },
    );
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<{ sessionId: string; paymentUrl: string }> {
    const {
      paymentSource,
      targetId,
      vatRateBps,
      amountCents,
      email,
      productName,
      productDescription,
      successUrl,
      cancelUrl,
    } = params;

    const session = await this.client.checkout.sessions.create(
      {
        mode: 'payment',
        expires_at: Math.floor((Date.now() + CHECKOUT_SESSION_TTL_MS) / 1000),
        customer_email: email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: amountCents, // integer cents
              product_data: {
                name: productName,
                ...(productDescription
                  ? { description: productDescription }
                  : {}),
              },
            },
          },
        ],
        // Read back by the webhook to attach the resulting Payment to the right
        // target. (Stripe metadata values must be strings.)
        metadata: {
          payment_source: paymentSource,
          target_id: targetId,
          vat_rate_bps: String(vatRateBps),
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
      {
        // One target only ever gets one session — a network-level retry (or a
        // client retry within 24h) returns the same session instead of minting
        // a duplicate payable link for the same booking/sale.
        idempotencyKey: `checkout:${paymentSource}:${targetId}`,
      },
    );

    if (!session.url) {
      this.logger.error(`Stripe session created but has no URL: ${session.id}`);
      throw new Error('Stripe checkout session URL is missing');
    }

    return {
      sessionId: session.id,
      paymentUrl: session.url,
    };
  }

  /**
   * Expire an open checkout session so its payment link stops working.
   * Stripe rejects the call unless the session is still 'open' — a session
   * that already completed or expired throws, which callers should treat as
   * a benign race, not a failure.
   */
  async expireCheckoutSession(sessionId: string): Promise<void> {
    await this.client.checkout.sessions.expire(sessionId);
  }

  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
    secret: string,
  ): ReturnType<typeof this.client.webhooks.constructEvent> {
    return this.client.webhooks.constructEvent(rawBody, signature, secret);
  }
}
