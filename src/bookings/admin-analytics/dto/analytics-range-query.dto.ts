import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class AnalyticsRangeQueryDto {
  @ApiProperty({
    description: 'Start date (YYYY-MM-DD), interpreted in timezone',
    example: '2026-02-20',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from!: string;

  @ApiProperty({
    description: 'End date (YYYY-MM-DD), interpreted in timezone',
    example: '2026-02-23',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to!: string;

  @ApiPropertyOptional({ default: 'Europe/Berlin', example: 'Europe/Berlin' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'If true, include WALK_IN in analytics',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeWalkIn?: boolean;
}

export class AnalyticsTimeseriesQueryDto extends AnalyticsRangeQueryDto {
  @ApiProperty({
    description: 'Bucket size',
    enum: ['day', 'week', 'month'],
    example: 'day',
  })
  @IsString()
  @IsIn(['day', 'week', 'month'])
  granularity!: 'day' | 'week' | 'month';
}

export class AnalyticsUtmQueryDto extends AnalyticsRangeQueryDto {
  @ApiProperty({
    description: 'Which UTM field to group by',
    enum: ['campaign', 'adset', 'ad'],
    example: 'campaign',
  })
  @IsString()
  @IsIn(['campaign', 'adset', 'ad'])
  dimension!: 'campaign' | 'adset' | 'ad';
}
