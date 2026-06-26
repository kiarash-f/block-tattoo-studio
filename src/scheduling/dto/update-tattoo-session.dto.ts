import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTattooSessionDto {
  @ApiPropertyOptional({ example: '2026-04-20T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  artistId?: string;

  @ApiPropertyOptional({
    example: '2026-04-20T15:00:00.000Z',
    description: 'New window start (ISO). Provide together with endsAt.',
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    example: '2026-04-20T17:00:00.000Z',
    description: 'New window end (ISO). Must be after startsAt.',
  })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
