import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AnalyticsRangeQueryDto,
  AnalyticsTimeseriesQueryDto,
  AnalyticsUtmQueryDto,
} from './dto/analytics-range-query.dto';
import { AnalyticsCapacityQueryDto } from './dto/analytics-capacity-query.dto';
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
  @ApiOperation({
    summary: 'Get analytics overview for a date range',
    description:
      'Returns total bookings and breakdown by type and status for the given ' +
      'date range, including the channel breakdown by source (bySource). ' +
      '(Revenue lives at GET /admin/analytics/revenue; per-artist breakdown ' +
      'lives at GET /admin/analytics/capacity.)',
  })
  @ApiResponse({ status: 200, description: 'Analytics overview returned.' })
  overview(@Query() q: AnalyticsRangeQueryDto) {
    return this.analytics.getOverview(q);
  }

  @Get('timeseries')
  @ApiOperation({
    summary: 'Analytics timeseries for a date range',
    description:
      'Returns booking counts over the specified date range, grouped by the ' +
      'requested interval (day/week/month). (Revenue timeseries lives at GET ' +
      '/admin/analytics/revenue/timeseries.)',
  })
  @ApiResponse({ status: 200, description: 'Timeseries data returned.' })
  timeseries(@Query() q: AnalyticsTimeseriesQueryDto) {
    return this.analytics.getTimeseries(q);
  }

  @Get('capacity')
  @ApiOperation({
    summary: 'Booking capacity by artist for a date range',
    description:
      'Returns TattooSession counts (total/completed/cancelled/noShow) grouped by ' +
      'artist, filtered by scheduledDate in range. Optional artistId/stationId ' +
      'narrow to one artist/station; omitted, returns all artists.',
  })
  @ApiResponse({ status: 200, description: 'Capacity breakdown returned.' })
  capacity(@Query() q: AnalyticsCapacityQueryDto) {
    return this.analytics.getCapacity(q);
  }

  @Get('utm')
  @ApiOperation({
    summary: 'Counts grouped by UTM dimension',
    description:
      'Returns booking counts broken down by UTM campaign, source, or medium for the given date range.',
  })
  @ApiResponse({ status: 200, description: 'UTM breakdown returned.' })
  utm(@Query() q: AnalyticsUtmQueryDto) {
    return this.analytics.getUtm(q);
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Revenue totals for a date range',
    description:
      'Sums PAID payments (integer cents) over the range: total gross/net/VAT, ' +
      'a breakdown by source, and the net/VAT split grouped by VAT rate. ' +
      'Refund-aware (PAID only); legacy guest Float totals are never included.',
  })
  @ApiResponse({ status: 200, description: 'Revenue totals returned.' })
  revenue(@Query() q: AnalyticsRangeQueryDto) {
    return this.analytics.getRevenueOverview(q);
  }

  @Get('revenue/timeseries')
  @ApiOperation({
    summary: 'Revenue timeseries for a date range',
    description:
      'Pre-bucketed revenue (day/week/month) over PAID payments: gross/net/VAT ' +
      'per bucket plus a per-source breakdown per bucket.',
  })
  @ApiResponse({ status: 200, description: 'Revenue timeseries returned.' })
  revenueTimeseries(@Query() q: AnalyticsTimeseriesQueryDto) {
    return this.analytics.getRevenueTimeseries(q);
  }
}
