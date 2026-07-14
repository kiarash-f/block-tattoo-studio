import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AnalyticsRangeQueryDto } from './analytics-range-query.dto';

/**
 * Query for GET /admin/analytics/capacity.
 *
 * Owns the optional artistId/stationId narrowing params: capacity is the only
 * artist/station-scoped analytics endpoint, so these live here rather than on
 * the shared AnalyticsRangeQueryDto (which the pipeline/channel endpoints all
 * inherit and none of which are artist/station-scoped).
 */
export class AnalyticsCapacityQueryDto extends AnalyticsRangeQueryDto {
  @ApiPropertyOptional({
    description: 'Narrow to a single artist. Omit to group across all artists.',
  })
  @IsOptional()
  @IsString()
  artistId?: string;

  @ApiPropertyOptional({
    description:
      'Narrow to a single station. Omit to group across all stations.',
  })
  @IsOptional()
  @IsString()
  stationId?: string;
}
