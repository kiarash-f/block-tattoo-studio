import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VoucherPurchaseService } from './voucher-purchase.service';
import { CreateVoucherPurchaseDto } from './dto/create-voucher-purchase.dto';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VoucherPurchaseController {
  constructor(private readonly service: VoucherPurchaseService) {}

  @Post('purchase')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Purchase a gift voucher (public)',
    description:
      'Validates the product (and a CUSTOM amount ≥ €100), prices it with any ' +
      'discount, creates a PENDING_PAYMENT voucher sale, and returns a Stripe ' +
      'checkout URL. The voucher code is emailed only after payment is confirmed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sale created; returns the sale stub and the Stripe payment URL.',
    schema: {
      example: {
        sale: { id: 'clx...', status: 'PENDING_PAYMENT', grossCents: 40000 },
        stripePaymentUrl: 'https://checkout.stripe.com/c/pay/cs_test_...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid amount / delivery / product type.' })
  @ApiResponse({ status: 404, description: 'Voucher product not found.' })
  purchase(@Body() dto: CreateVoucherPurchaseDto) {
    return this.service.purchase(dto);
  }
}
