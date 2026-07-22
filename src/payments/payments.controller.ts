import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AdminJwtPayload } from '../auth/jwt.strategy';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments.query.dto';

@ApiTags('Admin / Payments')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly invoices: InvoiceService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List payments',
    description:
      'Paginated, filterable list of payments (by source, method, status, and ' +
      'paidAt date range). Ordered by paidAt descending.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of payments.' })
  list(@Query() query: ListPaymentsQueryDto) {
    return this.payments.list(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Record a manual cash payment',
    description:
      'Creates a CASH Payment (status PAID) against a target (TATTOO → ' +
      'bookingRequestId, GUEST_TABLE → guestArtistBookingId). The VAT split is ' +
      'computed server-side from the configured rate; createdByAdminId is taken ' +
      'from the authenticated admin. Send an `idempotencyKey` (minted once per ' +
      'payment form and reused on retry) to make double submits safe: a repeat ' +
      'returns the original payment with `idempotentReplay: true` instead of ' +
      'recording a second one.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Payment recorded, or — when idempotencyKey matches an earlier ' +
      'submission — the previously recorded payment (idempotentReplay: true).',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid amount, or target does not match source.',
  })
  @ApiResponse({ status: 404, description: 'Target not found.' })
  create(@Body() dto: CreatePaymentDto, @Req() req: any) {
    const user = req.user as AdminJwtPayload;
    return this.payments.createCashPayment(dto, user.sub);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel a payment (mark as no-longer-counting)',
    description:
      'Flips a PAID payment to CANCELLED so it drops out of revenue analytics and ' +
      'booking balance (both count only PAID rows). Used for the studio\'s rare ' +
      'cash refunds. Rejects payments that are already CANCELLED or REFUNDED. An ' +
      'optional reason is appended to the payment note.',
  })
  @ApiParam({ name: 'id', description: 'Payment id (cuid)' })
  @ApiResponse({ status: 200, description: 'Payment cancelled.' })
  @ApiResponse({
    status: 400,
    description: 'Payment is in a status that cannot be cancelled (e.g. REFUNDED).',
  })
  @ApiResponse({
    status: 409,
    description:
      'Payment is already CANCELLED — including when a concurrent request ' +
      'cancelled it first.',
  })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelPaymentDto,
    @Req() req: any,
  ) {
    const user = req.user as AdminJwtPayload;
    return this.payments.cancelPayment(id, user.sub, dto.reason);
  }

  @Get(':id/invoice')
  @ApiOperation({
    summary: 'Fetch the §14 UStG invoice for a payment',
    description:
      'Returns the immutable invoice snapshot created with the payment ' +
      '(gap-free number, studio identity, net/VAT/gross + rate, customer). ' +
      'PDF rendering is a later concern — this returns the invoice data only. ' +
      '404 if the payment has no invoice (e.g. payments recorded before ' +
      'invoicing went live — historical rows are not backfilled).',
  })
  @ApiParam({ name: 'id', description: 'Payment id (cuid)' })
  @ApiResponse({ status: 200, description: 'Invoice snapshot.' })
  @ApiResponse({ status: 404, description: 'No invoice for this payment.' })
  async invoice(@Param('id') id: string) {
    const invoice = await this.invoices.getByPaymentId(id);
    if (!invoice) {
      throw new NotFoundException(`No invoice found for payment ${id}`);
    }
    return invoice;
  }
}
