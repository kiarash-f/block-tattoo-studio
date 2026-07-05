import { ApiProperty } from '@nestjs/swagger';
import { PaymentSource } from '@prisma/client';

/** Two-value status union reported by the public lookup (for now). */
export type PublicPaymentStatus = 'PAID' | 'PENDING';

/**
 * Deliberately minimal, source-safe shape. Reports only whether a Payment has
 * been recorded for the session and, if so, which flow it belongs to. No
 * amount, customer, booking, or sale fields are exposed on this public route.
 */
export class PaymentStatusResponseDto {
  @ApiProperty({
    enum: ['PAID', 'PENDING'],
    description:
      'PAID once the webhook has recorded a Payment for this session; ' +
      'PENDING while unprocessed OR for an unknown session id.',
    example: 'PAID',
  })
  status!: PublicPaymentStatus;

  @ApiProperty({
    enum: PaymentSource,
    nullable: true,
    description:
      'Payment source discriminator when PAID (e.g. GUEST_TABLE, VOUCHER); ' +
      'null when PENDING.',
    example: PaymentSource.VOUCHER,
  })
  context!: PaymentSource | null;
}
