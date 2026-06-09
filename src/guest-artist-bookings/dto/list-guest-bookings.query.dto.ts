import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuestBookingStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListGuestBookingsQueryDto {
  @ApiPropertyOptional({
    enum: GuestBookingStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(GuestBookingStatus)
  status?: GuestBookingStatus;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'Filter bookings that overlap on or after this date',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    description: 'Filter bookings that overlap on or before this date',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

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
