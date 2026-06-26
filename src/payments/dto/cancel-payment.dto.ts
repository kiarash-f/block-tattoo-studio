import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelPaymentDto {
  @ApiPropertyOptional({
    description:
      'Optional reason for cancelling — appended to the payment note for audit.',
    example: 'Refunded in cash',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
