import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateConsultSlotDto {
  @ApiProperty({
    description: 'One or more dates for consult slots (YYYY-MM-DD)',
    example: ['2026-06-16', '2026-06-17', '2026-06-18'],
    type: [String],
  })
  @IsDateString({}, { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(60)
  dates!: string[];

  @ApiPropertyOptional({
    description: 'Max concurrent consults per date',
    default: 3,
  })
  @IsOptional()
  @IsInt()
  maxCount?: number;
}
