import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, BookingType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class ListAppointmentsQueryDto {
  @ApiProperty({
    example: '2026-02-23',
    description: 'YYYY-MM-DD (shop local day)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiPropertyOptional({ example: 'Europe/Berlin', default: 'Europe/Berlin' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: BookingType })
  @IsOptional()
  @IsEnum(BookingType)
  bookingType?: BookingType;

  @ApiPropertyOptional({ description: 'Filter by artistId (cuid)' })
  @IsOptional()
  @IsString()
  artistId?: string;

  @ApiPropertyOptional({ description: 'Filter by stationId (cuid)' })
  @IsOptional()
  @IsString()
  stationId?: string;
}
