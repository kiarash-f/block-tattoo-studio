import {
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { VoucherSalesService } from './voucher-sales.service';
import { ListVoucherSalesQueryDto } from './dto/list-voucher-sales.query.dto';

@ApiTags('Admin / Vouchers')
@ApiBearerAuth('admin-jwt')
@Controller('admin/vouchers')
@UseGuards(AuthGuard('jwt'))
export class AdminVouchersController {
  constructor(private readonly service: VoucherSalesService) {}

  @Get()
  @ApiOperation({
    summary: 'List issued vouchers',
    description:
      'Paginated list of voucher sales. Filterable by status, product type, and ' +
      'a text search over code / buyer email / buyer name.',
  })
  @ApiResponse({ status: 200, description: 'Paged list of voucher sales.' })
  findAll(@Query() query: ListVoucherSalesQueryDto) {
    return this.service.list(query);
  }

  @Get(':code')
  @ApiOperation({
    summary: 'Look up a voucher by code',
    description: 'Resolves a voucher by its code — used by the QR-scan flow before redeeming.',
  })
  @ApiParam({ name: 'code', description: 'The voucher code' })
  @ApiResponse({ status: 200, description: 'Voucher found.' })
  @ApiResponse({ status: 404, description: 'Voucher not found.' })
  findByCode(@Param('code') code: string) {
    return this.service.findByCode(code);
  }

  @Post(':code/redeem')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Redeem a voucher',
    description:
      'Flips a VALID voucher to REDEEMED (no partial redemption) and stamps the ' +
      'redeeming admin + timestamp. Rejects vouchers that are already redeemed, ' +
      'cancelled, or not yet paid. Records NO payment.',
  })
  @ApiParam({ name: 'code', description: 'The voucher code' })
  @ApiResponse({ status: 200, description: 'Voucher redeemed.' })
  @ApiResponse({ status: 400, description: 'Voucher cancelled or not yet paid.' })
  @ApiResponse({ status: 404, description: 'Voucher not found.' })
  @ApiResponse({ status: 409, description: 'Voucher already redeemed.' })
  redeem(@Param('code') code: string, @Req() req: any) {
    return this.service.redeem(code, req.user.sub);
  }
}
