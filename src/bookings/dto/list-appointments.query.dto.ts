import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export enum AppointmentPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class ListAppointmentsQueryDto {
  @ApiProperty({
    example: '2026-06-10',
    description: 'YYYY-MM-DD anchor date (any day within the desired period)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiPropertyOptional({
    enum: AppointmentPeriod,
    default: AppointmentPeriod.DAY,
    description: 'day = that day | week = Mon–Sun of that week | month = full month | year = full year',
  })
  @IsOptional()
  @IsEnum(AppointmentPeriod)
  period?: AppointmentPeriod;

  @ApiPropertyOptional({ example: 'Europe/Berlin', default: 'Europe/Berlin' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
