import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendCampaignDto {
  @ApiProperty({ example: 'Summer flash day — book your spot!' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    example: '<p>Hey! We have a special event coming up…</p>',
    description: 'Raw HTML body for the email. Wrapped in studio template automatically.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    enum: ['all', 'completed', 'active'],
    default: 'all',
    description:
      '"all" = every client with an email; "completed" = clients with at least one COMPLETED booking; "active" = PENDING_CONSULT / CONSULT_APPROVED / TATTOO_SCHEDULED',
  })
  @IsOptional()
  @IsIn(['all', 'completed', 'active'])
  audience?: 'all' | 'completed' | 'active' = 'all';
}
