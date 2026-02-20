import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class KioskBookingIntakeResponseDto {
  @ApiProperty({ example: '6c6f5e0d-2c27-4c6e-8c7f-0e8a2c60f0de' })
  bookingRequestId: string;

  @ApiProperty({ enum: BookingStatus, example: 'NEW' })
  status: BookingStatus;

  @ApiProperty({ example: '2026-02-20T18:22:10.123Z' })
  createdAt: string;

  @ApiProperty({
    description:
      'Tokenized URL used for QR code. Client opens this on phone to upload images.',
    example: 'https://yourdomain.com/public/booking/ckx123abc.DEF456secret',
  })
  uploadUrl: string;

  @ApiProperty({ example: '2026-02-20T18:52:10.123Z' })
  uploadUrlExpiresAt: string;
}
