import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { VoucherStatus, VoucherType } from '@prisma/client';

export class ListVoucherSalesQueryDto {
  @ApiPropertyOptional({ enum: VoucherStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;

  @ApiPropertyOptional({ enum: VoucherType, description: 'Filter by product type' })
  @IsOptional()
  @IsEnum(VoucherType)
  type?: VoucherType;

  @ApiPropertyOptional({ description: 'Search by code, buyer email, or buyer name' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
