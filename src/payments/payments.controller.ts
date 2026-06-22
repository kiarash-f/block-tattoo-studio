import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AdminJwtPayload } from '../auth/jwt.strategy';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments.query.dto';

@ApiTags('Admin / Payments')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

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
      'from the authenticated admin.',
  })
  @ApiResponse({ status: 201, description: 'Payment recorded.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid amount, or target does not match source.',
  })
  @ApiResponse({ status: 404, description: 'Target not found.' })
  create(@Body() dto: CreatePaymentDto, @Req() req: any) {
    const user = req.user as AdminJwtPayload;
    return this.payments.createCashPayment(dto, user.sub);
  }
}
