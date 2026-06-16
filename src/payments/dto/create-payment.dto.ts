import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentSource } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Admin-created cash payment. method/status are fixed server-side (CASH/PAID);
 * createdByAdminId comes from the authenticated admin, not the client.
 * The "exactly one target, agreeing with source" invariant and target existence
 * are enforced server-side in PaymentsService — not via decorators.
 */
export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentSource, example: PaymentSource.TATTOO })
  @IsEnum(PaymentSource)
  source: PaymentSource;

  @ApiProperty({
    example: 15000,
    description: 'Gross amount received, in integer cents (> 0)',
  })
  @IsInt()
  @Min(1)
  grossCents: number;

  @ApiPropertyOptional({
    description: 'Target BookingRequest id — required when source = TATTOO',
  })
  @IsOptional()
  @IsString()
  bookingRequestId?: string;

  @ApiPropertyOptional({
    description:
      'Target GuestArtistBooking id — required when source = GUEST_TABLE',
  })
  @IsOptional()
  @IsString()
  guestArtistBookingId?: string;

  @ApiPropertyOptional({ example: 'Cash deposit at studio', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiPropertyOptional({
    description: 'When the cash was received (ISO); defaults to now',
    example: '2026-06-15T14:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  paidAt?: string;
}
