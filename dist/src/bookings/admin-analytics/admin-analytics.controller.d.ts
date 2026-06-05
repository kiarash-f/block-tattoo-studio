import { AnalyticsRangeQueryDto, AnalyticsTimeseriesQueryDto, AnalyticsUtmQueryDto } from './dto/analytics-range-query.dto';
import { AdminAnalyticsService } from './admin-analytics.service';
export declare class AdminAnalyticsController {
    private readonly analytics;
    constructor(analytics: AdminAnalyticsService);
    overview(q: AnalyticsRangeQueryDto): Promise<{
        timezone: string;
        range: {
            startUtc: Date;
            endUtc: Date;
        };
        total: number;
        status: {
            approved: number;
            completed: number;
            cancelled: number;
            noShow: number;
        };
        bySource: Record<string, number>;
        byBookingType: Record<string, number>;
    }>;
    timeseries(q: AnalyticsTimeseriesQueryDto): Promise<{
        timezone: string;
        range: {
            startUtc: Date;
            endUtc: Date;
        };
        granularity: "week" | "day" | "month";
        items: {
            key: string;
            label: string;
            startUtc: Date;
            endUtc: Date;
            total: number;
            approved: number;
            completed: number;
            cancelled: number;
            noShow: number;
        }[];
    }>;
    sources(q: AnalyticsRangeQueryDto): Promise<{
        timezone: string;
        range: {
            startUtc: Date;
            endUtc: Date;
        };
        total: number;
        items: {
            source: string;
            count: number;
        }[];
    }>;
    utm(q: AnalyticsUtmQueryDto): Promise<{
        timezone: string;
        range: {
            startUtc: Date;
            endUtc: Date;
        };
        total: number;
        dimension: "campaign" | "adset" | "ad";
        items: {
            [x: string]: string | number;
            count: number;
        }[];
    }>;
}
