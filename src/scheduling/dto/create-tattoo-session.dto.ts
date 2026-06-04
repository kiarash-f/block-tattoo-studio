import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTattooSessionDto {
  @ApiProperty({
    description: 'Scheduled date/time for the session (ISO 8601)',
    example: '2026-04-15T10:00:00.000Z',
  })
  @IsDateString()
  scheduledDate!: string;

  @ApiProperty({ description: 'Artist id to assign to the session' })
  @IsString()
  @IsNotEmpty()
  artistId!: string;

  @ApiPropertyOptional({
    example: 'Full day',
    description: 'Free-text duration note',
  })
  @IsOptional()
  @IsString()
  durationNote?: string;

  @ApiPropertyOptional({ description: 'Internal session notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
