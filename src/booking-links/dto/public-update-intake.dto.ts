import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { BudgetRange, PreferredTimeOfDay } from '@prisma/client';

export class PublicUpdateIntakeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sizeDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  styleNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: BudgetRange })
  @IsOptional()
  @IsEnum(BudgetRange)
  budgetRange?: BudgetRange;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  referencesNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  preferredArtistName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  studioChooses?: boolean;

  @ApiPropertyOptional({ example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  preferredDateFrom?: string;

  @ApiPropertyOptional({ example: '2026-03-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  preferredDateTo?: string;

  @ApiPropertyOptional({ enum: PreferredTimeOfDay })
  @IsOptional()
  @IsEnum(PreferredTimeOfDay)
  preferredTimeOfDay?: PreferredTimeOfDay;

  @ApiPropertyOptional({
    description: 'Extra notes about preferred days/times',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  preferredDaysNote?: string;
}
