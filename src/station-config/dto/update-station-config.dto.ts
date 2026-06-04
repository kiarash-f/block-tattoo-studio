import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateStationConfigDto {
  @ApiPropertyOptional({
    example: 5,
    description: 'Total number of tables available for guest artists',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalTables?: number;

  @ApiPropertyOptional({
    example: 80,
    description: 'Price per table per day in EUR',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerDay?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Discount % applied when booking >= 30 days (default 10)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  monthlyDiscountPercent?: number;
}
