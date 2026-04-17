import {
  Controller,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShopifyWebhookService } from './shopify-webhook.service';

// NOTE: This controller requires raw body access for HMAC verification.
// NestFactory.create() must be called with { rawBody: true } in main.ts — already done.
// The route is intentionally unauthenticated; Shopify signs every payload via HMAC.

interface ShopifyRawRequest {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

@ApiTags('Webhooks')
@SkipThrottle()
@Controller('webhooks/shopify')
export class ShopifyWebhookController {
  constructor(private readonly service: ShopifyWebhookService) {}

  @Post('payment')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Shopify payment webhook',
    description:
      'Receives Shopify order/payment events. Verifies HMAC-SHA256 signature, ' +
      'then transitions the matching GuestArtistBooking from PENDING_PAYMENT → CONFIRMED ' +
      'and sends the guest a confirmation email.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed.' })
  @ApiResponse({ status: 401, description: 'Invalid HMAC signature.' })
  payment(@Req() req: ShopifyRawRequest) {
    const rawBody = req.rawBody ?? Buffer.from('');
    const hmac    = (req.headers['x-shopify-hmac-sha256'] as string) ?? '';
    return this.service.handlePaymentWebhook(rawBody, hmac);
  }
}
