import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get analytics overview for a date range' })
  overview(@Query() q: AnalyticsRangeQueryDto) {
    return this.analytics.getOverview(q);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Analytics timeseries for a date range' })
  timeseries(@Query() q: AnalyticsTimeseriesQueryDto) {
    return this.analytics.getTimeseries(q);
  }

  @Get('sources')
  @ApiOperation({ summary: 'Counts grouped by booking source' })
  sources(@Query() q: AnalyticsRangeQueryDto) {
    return this.analytics.getSources(q);
  }

  @Get('utm')
  @ApiOperation({ summary: 'Counts grouped by UTM dimension' })
  utm(@Query() q: AnalyticsUtmQueryDto) {
    return this.analytics.getUtm(q);
  }
}
