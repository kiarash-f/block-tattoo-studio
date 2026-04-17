import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CreateDraftOrderParams {
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
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);

  constructor(private readonly config: ConfigService) {}

  async createDraftOrder(
    params: CreateDraftOrderParams,
  ): Promise<{ draftOrderId: string; invoiceUrl: string }> {
    const domain = this.config.getOrThrow<string>('SHOPIFY_STORE_DOMAIN');
    const token  = this.config.getOrThrow<string>('SHOPIFY_ADMIN_API_ACCESS_TOKEN');

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

    const payload = {
      draft_order: {
        line_items: [
          {
            title: 'Guest Artist Table Booking',
            price: totalPrice.toFixed(2),
            quantity: 1,
          },
        ],
        customer: { email },
        note:
          `Booking ID: ${bookingId} | ${numberOfTables} table(s) | ` +
          `${numberOfDays} day(s) | ${fmt(startDate)} to ${fmt(endDate)}`,
        note_attributes: [{ name: 'booking_id', value: bookingId }],
        use_customer_default_address: false,
      },
    };

    const res = await fetch(
      `https://${domain}/admin/api/2024-01/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `Shopify draft order creation failed [${res.status}]: ${text}`,
      );
      throw new Error(`Shopify API error: ${res.status}`);
    }

    const json = (await res.json()) as {
      draft_order: { id: number; invoice_url: string };
    };

    return {
      draftOrderId: String(json.draft_order.id),
      invoiceUrl: json.draft_order.invoice_url,
    };
  }
}
