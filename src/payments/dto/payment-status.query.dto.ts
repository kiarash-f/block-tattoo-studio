import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Query for the public payment-status lookup. `session_id` is the Stripe
 * checkout session id the success page received via the success_url template
 * (`{CHECKOUT_SESSION_ID}`). Trimmed, then required to be non-empty so a blank
 * or whitespace-only value is a clean 400 rather than a silent PENDING.
 */
export class PaymentStatusQueryDto {
  @ApiProperty({
    name: 'session_id',
    description: 'Stripe checkout session id to check.',
    example: 'cs_test_a1b2c3',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  session_id!: string;
}
