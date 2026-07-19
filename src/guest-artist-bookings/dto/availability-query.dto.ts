import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';
import { IsWithinDaysOf } from './date-range.validator';

export class AvailabilityQueryDto {
  @ApiProperty({
    example: '2026-06-01',
    description: 'Start of the range — ISO date YYYY-MM-DD',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-06-30',
    description:
      'End of the range — ISO date YYYY-MM-DD. Max 90 days after startDate.',
  })
  @IsDateString()
  @IsWithinDaysOf('startDate', 90)
  endDate: string;
}
