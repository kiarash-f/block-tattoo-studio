import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuestBookingStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class ListGuestBookingsQueryDto {
  @ApiPropertyOptional({ enum: GuestBookingStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(GuestBookingStatus)
  status?: GuestBookingStatus;

  @ApiPropertyOptional({ example: '2026-06-01', description: 'Filter bookings that overlap on or after this date' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-06-30', description: 'Filter bookings that overlap on or before this date' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
