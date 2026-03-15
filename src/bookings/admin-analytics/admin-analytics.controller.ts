import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  AnalyticsRangeQueryDto,
  AnalyticsTimeseriesQueryDto,
  AnalyticsUtmQueryDto,
} from './dto/analytics-range-query.dto';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AuthGuard } from '@nestjs/passport';
import { UseGuards } from '@nestjs/common';

@ApiTags('Admin / Analytics')
@ApiBearerAuth('admin-jwt')
@Controller('admin/analytics')
@UseGuards(AuthGuard('jwt'))
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get analytics overview for a date range', description: 'Returns total bookings, breakdown by type and status, revenue metrics, and other summary statistics for the given date range.' })
  @ApiResponse({ status: 200, description: 'Analytics overview returned.' })
  overview(@Query() q: AnalyticsRangeQueryDto) {
    return this.analytics.getOverview(q);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Analytics timeseries for a date range', description: 'Returns daily booking counts over the specified date range, grouped by the requested interval.' })
  @ApiResponse({ status: 200, description: 'Timeseries data returned.' })
  timeseries(@Query() q: AnalyticsTimeseriesQueryDto) {
    return this.analytics.getTimeseries(q);
  }

  @Get('sources')
  @ApiOperation({ summary: 'Counts grouped by booking source', description: 'Returns booking counts broken down by referral source (e.g. instagram, google, walk-in) for the given date range.' })
  @ApiResponse({ status: 200, description: 'Source breakdown returned.' })
  sources(@Query() q: AnalyticsRangeQueryDto) {
    return this.analytics.getSources(q);
  }

  @Get('utm')
  @ApiOperation({ summary: 'Counts grouped by UTM dimension', description: 'Returns booking counts broken down by UTM campaign, source, or medium for the given date range.' })
  @ApiResponse({ status: 200, description: 'UTM breakdown returned.' })
  utm(@Query() q: AnalyticsUtmQueryDto) {
    return this.analytics.getUtm(q);
  }
}
