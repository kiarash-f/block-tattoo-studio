import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateConsultSlotDto {
  @ApiProperty({
    description: 'Date for the consult slot (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    description: 'Max concurrent consults on this date',
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxCount?: number;
}
