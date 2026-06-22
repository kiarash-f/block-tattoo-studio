import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { VoucherTreatment } from '@prisma/client';

// `type` is intentionally NOT updatable — changing a product's voucher type
// would invalidate its pricing/discount semantics and any issued sales.
export class UpdateVoucherProductDto {
  @ApiPropertyOptional({
    example: 'Full Day of Work',
    description: 'Base product name. Re-translated to DE/EN when changed.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Gross price in integer cents. Not allowed on CUSTOM products.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  priceCents?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Whole-percent discount. FULL_DAY/HALF_DAY only.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ enum: VoucherTreatment })
  @IsOptional()
  @IsEnum(VoucherTreatment)
  voucherTreatment?: VoucherTreatment;

  @ApiPropertyOptional({
    description: 'Deactivate to hide the product from the public shop (existing sales are unaffected).',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
