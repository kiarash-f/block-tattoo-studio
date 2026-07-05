import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaymentStatusQueryDto } from './dto/payment-status.query.dto';
import { PaymentStatusResponseDto } from './dto/payment-status.response.dto';

// ─── Public route ───────────────────────────────────────────────────────────
// Unauthenticated by design (no guard, no @ApiBearerAuth) so the checkout
// success page can verify a payment instead of trusting the URL's session_id.

@ApiTags('Payments')
@Controller('payments')
export class PaymentsPublicController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Check payment status by checkout session (public)',
    description:
      'Reports whether a Payment has been recorded for the given Stripe ' +
      'checkout session id. Reads our own DB (the webhook is the source of ' +
      'truth) — does not call Stripe. Unknown and not-yet-processed session ' +
      'ids both return PENDING (no 404); the client polls until PAID or times ' +
      'out. Returns only { status, context } — no amount or customer data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment status for the session.',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'session_id missing or blank.' })
  getStatus(
    @Query() query: PaymentStatusQueryDto,
  ): Promise<PaymentStatusResponseDto> {
    return this.payments.getPublicStatusBySessionId(query.session_id);
  }
}
