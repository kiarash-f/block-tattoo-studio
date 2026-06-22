import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { VoucherDelivery } from '@prisma/client';

/** Minimum buyer-entered amount for a CUSTOM voucher: €100 = 10000 cents. */
export const VOUCHER_CUSTOM_MIN_CENTS = 10_000;

export class CreateVoucherPurchaseDto {
  @ApiProperty({ description: 'VoucherProduct id being purchased.' })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({
    example: 12000,
    description:
      'Buyer-entered gross amount in integer cents. Required for CUSTOM ' +
      'products (must be ≥ 10000 = €100); rejected for FULL_DAY/HALF_DAY.',
  })
  @IsOptional()
  @IsInt()
  @Min(VOUCHER_CUSTOM_MIN_CENTS)
  amountCents?: number;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @Length(1, 200)
  buyerName!: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  buyerEmail!: string;

  @ApiPropertyOptional({
    enum: VoucherDelivery,
    default: VoucherDelivery.EMAIL,
    description:
      'EMAIL (always emailed) or EMAIL_AND_POST (also mailed by the studio — ' +
      'requires the shipping fields below).',
  })
  @IsOptional()
  @IsEnum(VoucherDelivery)
  delivery?: VoucherDelivery;

  @ApiPropertyOptional({ description: 'Recipient name for postal delivery.' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  shippingName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  shippingLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  shippingLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 20)
  shippingPostalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  shippingCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  shippingCountry?: string;
}
