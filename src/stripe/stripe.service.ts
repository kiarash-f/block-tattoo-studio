import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface CreateCheckoutSessionParams {
  guestName: string;
  email: string;
  totalPrice: number;
  bookingId: string;
  numberOfTables: number;
  numberOfDays: number;
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  // Let TypeScript infer the instance type from the constructor return
  private readonly client: ReturnType<typeof Stripe>;

  constructor(private readonly config: ConfigService) {
    this.client = new Stripe(
      this.config.getOrThrow<string>('STRIPE_SECRET_KEY'),
      { apiVersion: '2026-03-25.dahlia' },
    );
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<{ sessionId: string; paymentUrl: string }> {
    const {
      email,
      totalPrice,
      bookingId,
      numberOfTables,
      numberOfDays,
      startDate,
      endDate,
    } = params;

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(totalPrice * 100), // Stripe uses cents
            product_data: {
              name: 'Guest Artist Table Booking',
              description:
                `${numberOfTables} table(s) · ${numberOfDays} day(s) · ` +
                `${fmt(startDate)} to ${fmt(endDate)}`,
            },
          },
        },
      ],
      metadata: { booking_id: bookingId },
      success_url:
        `${this.config.getOrThrow<string>('PUBLIC_BASE_URL')}/guest-booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        `${this.config.getOrThrow<string>('PUBLIC_BASE_URL')}/guest-booking/cancelled`,
    });

    if (!session.url) {
      this.logger.error(
        `Stripe session created but has no URL: ${session.id}`,
      );
      throw new Error('Stripe checkout session URL is missing');
    }

    return {
      sessionId:  session.id,
      paymentUrl: session.url,
    };
  }

  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
    secret: string,
  ): ReturnType<typeof this.client.webhooks.constructEvent> {
    return this.client.webhooks.constructEvent(rawBody, signature, secret);
  }
}
