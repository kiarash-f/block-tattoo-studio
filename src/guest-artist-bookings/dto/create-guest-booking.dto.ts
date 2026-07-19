import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsWithinDaysOf } from './date-range.validator';

export class CreateGuestBookingDto {
  @ApiProperty({
    example: 'Alex Müller',
    description: 'Full name of the guest artist',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: '+49123456789', description: 'Contact phone number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone: string;

  @ApiProperty({
    example: 'alex@studio.de',
    description: 'Contact email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '2026-06-01',
    description: 'Start date (inclusive) — ISO date YYYY-MM-DD',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-06-07',
    description:
      'End date (inclusive) — ISO date YYYY-MM-DD. Max 90 days after startDate.',
  })
  @IsDateString()
  @IsWithinDaysOf('startDate', 90)
  endDate: string;

  @ApiProperty({
    example: 1,
    description: 'Number of tables to reserve per day (1–20)',
  })
  @IsInt()
  @Min(1)
  // DTO-level sanity ceiling only; real per-day capacity is enforced against
  // StationConfig.totalTables in the service.
  @Max(20)
  numberOfTables: number;

  @ApiProperty({
    example: true,
    description:
      'Must be true — artist acknowledges terms, document requirements, and non-refundable policy',
  })
  @IsBoolean()
  acknowledgment: boolean;
}
