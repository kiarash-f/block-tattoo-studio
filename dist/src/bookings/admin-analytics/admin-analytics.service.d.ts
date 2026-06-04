import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsRangeQueryDto, AnalyticsTimeseriesQueryDto, AnalyticsUtmQueryDto } from './dto/analytics-range-query.dto';
type TimeseriesBucket = {
    key: string;
    label: string;
    startUtc: Date;
    endUtc: Date;
    total: number;
    approved: number;
    completed: number;
    cancelled: number;
    noShow: number;
};
export declare class AdminAnalyticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private tzOrDefault;
    private getUtcRangeForZonedDate;
    private getUtcRangeForZonedDateRange;
    private loadRows;
    getOverview(q: AnalyticsRangeQueryDto): Promise<{
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
    getSources(q: AnalyticsRangeQueryDto): Promise<{
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
    getUtm(q: AnalyticsUtmQueryDto): Promise<{
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
    getTimeseries(q: AnalyticsTimeseriesQueryDto): Promise<{
        timezone: string;
        range: {
            startUtc: Date;
            endUtc: Date;
        };
        granularity: "week" | "day" | "month";
        items: TimeseriesBucket[];
    }>;
    private buildBuckets;
    private bucketKeyForDate;
    private bucketsByKey;
}
export {};
