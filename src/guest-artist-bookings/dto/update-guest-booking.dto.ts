import { ApiPropertyOptional } from '@nestjs/swagger';
import { GuestBookingStatus } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateGuestBookingDto {
  @ApiPropertyOptional({ example: 'Alex Müller' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '+49123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'alex@studio.de' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '2026-06-01',
    description: 'ISO date YYYY-MM-DD',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-06-07',
    description: 'ISO date YYYY-MM-DD',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 2, description: 'Number of tables per day' })
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfTables?: number;

  @ApiPropertyOptional({ enum: GuestBookingStatus })
  @IsOptional()
  @IsEnum(GuestBookingStatus)
  status?: GuestBookingStatus;
}
