import {
  Controller,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StripeWebhookService } from './stripe-webhook.service';

// NOTE: requires rawBody: true in NestFactory.create() — already set in main.ts
// Route is intentionally unauthenticated; Stripe signs every payload.

interface RawRequest {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}

@ApiTags('Webhooks')
@SkipThrottle()
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private readonly service: StripeWebhookService) {}

  @Post('payment')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Stripe payment webhook',
    description:
      'Receives Stripe checkout.session.completed events. Verifies the ' +
      'Stripe signature, then transitions the matching GuestArtistBooking ' +
      'from PENDING_PAYMENT → CONFIRMED and sends a confirmation email.',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed.' })
  @ApiResponse({ status: 401, description: 'Invalid Stripe signature.' })
  payment(@Req() req: RawRequest) {
    const rawBody   = req.rawBody ?? Buffer.from('');
    const signature = (req.headers['stripe-signature'] as string) ?? '';
    return this.service.handlePaymentWebhook(rawBody, signature);
  }
}
