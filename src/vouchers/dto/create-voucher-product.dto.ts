import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { VoucherTreatment, VoucherType } from '@prisma/client';

export class CreateVoucherProductDto {
  @ApiProperty({ enum: VoucherType, example: VoucherType.FULL_DAY })
  @IsEnum(VoucherType)
  type!: VoucherType;

  @ApiProperty({
    example: 'Full Day of Work',
    description: 'Base product name. Auto-translated to DE/EN on save.',
  })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiPropertyOptional({
    example: 50000,
    description:
      'Gross price in integer cents. Required for FULL_DAY/HALF_DAY; must be omitted for CUSTOM (buyer enters the amount at purchase).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  priceCents?: number;

  @ApiPropertyOptional({
    example: 20,
    default: 0,
    description:
      'Whole-percent discount. FULL_DAY/HALF_DAY only — rejected on CUSTOM.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({
    enum: VoucherTreatment,
    default: VoucherTreatment.SINGLE_PURPOSE,
    description:
      'German VAT treatment. Only SINGLE_PURPOSE is implemented (VAT taken at sale).',
  })
  @IsOptional()
  @IsEnum(VoucherTreatment)
  voucherTreatment?: VoucherTreatment;
}
