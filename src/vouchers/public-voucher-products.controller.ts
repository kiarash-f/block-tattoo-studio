import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VoucherProductsService } from './voucher-products.service';

@ApiTags('Vouchers')
@Controller('vouchers')
export class PublicVoucherProductsController {
  constructor(private readonly service: VoucherProductsService) {}

  @Get('products')
  @ApiOperation({
    summary: 'List active voucher products (public)',
    description:
      'Returns only active products with shop-safe fields and a computed ' +
      'finalPriceCents (price after discount; null for CUSTOM, where the buyer ' +
      'enters the amount). Both De/En name variants are returned for the client ' +
      'to localize. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active voucher products.',
    schema: {
      example: [
        {
          id: 'clx...',
          type: 'FULL_DAY',
          name: 'Full Day of Work',
          nameDe: 'Ganztägige Arbeit',
          nameEn: 'Full Day of Work',
          priceCents: 50000,
          discountPercent: 20,
          finalPriceCents: 40000,
        },
        {
          id: 'cly...',
          type: 'CUSTOM',
          name: 'Custom Amount',
          nameDe: 'Wunschbetrag',
          nameEn: 'Custom Amount',
          priceCents: null,
          discountPercent: 0,
          finalPriceCents: null,
        },
      ],
    },
  })
  listProducts() {
    return this.service.listPublic();
  }
}
