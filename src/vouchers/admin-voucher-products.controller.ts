import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { VoucherProductsService } from './voucher-products.service';
import { CreateVoucherProductDto } from './dto/create-voucher-product.dto';
import { UpdateVoucherProductDto } from './dto/update-voucher-product.dto';
import { ListVoucherProductsQueryDto } from './dto/list-voucher-products.query.dto';

@ApiTags('Admin / Voucher Products')
@ApiBearerAuth('admin-jwt')
@Controller('admin/voucher-products')
@UseGuards(AuthGuard('jwt'))
export class AdminVoucherProductsController {
  constructor(private readonly service: VoucherProductsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a voucher product (template/batch)',
    description:
      'Creates a sellable voucher product. The base name is auto-translated to DE/EN. ' +
      'FULL_DAY/HALF_DAY require priceCents and may carry a discount; CUSTOM takes no ' +
      'price and no discount (the buyer enters an amount ≥ €100 at purchase).',
  })
  @ApiResponse({ status: 201, description: 'Voucher product created.' })
  @ApiResponse({
    status: 400,
    description: 'Pricing/discount rule violated for the chosen type.',
  })
  create(@Body() dto: CreateVoucherProductDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List voucher products',
    description: 'Paginated list of voucher products, optionally filtered by type.',
  })
  @ApiResponse({ status: 200, description: 'Paged list of voucher products.' })
  findAll(@Query() query: ListVoucherProductsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a voucher product by id' })
  @ApiParam({ name: 'id', description: 'VoucherProduct id (cuid)' })
  @ApiResponse({ status: 200, description: 'Voucher product found.' })
  @ApiResponse({ status: 404, description: 'Voucher product not found.' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a voucher product',
    description:
      'Updates price, discount %, name (re-translated to DE/EN), or VAT treatment. ' +
      'The voucher type is immutable. Pricing/discount rules are re-validated.',
  })
  @ApiParam({ name: 'id', description: 'VoucherProduct id (cuid)' })
  @ApiResponse({ status: 200, description: 'Voucher product updated.' })
  @ApiResponse({ status: 400, description: 'Pricing/discount rule violated.' })
  @ApiResponse({ status: 404, description: 'Voucher product not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateVoucherProductDto) {
    return this.service.update(id, dto);
  }
}
