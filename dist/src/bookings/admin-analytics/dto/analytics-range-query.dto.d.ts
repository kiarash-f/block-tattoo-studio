export declare class AnalyticsRangeQueryDto {
    from: string;
    to: string;
    timezone?: string;
    artistId?: string;
    stationId?: string;
    includeWalkIn?: boolean;
}
export declare class AnalyticsTimeseriesQueryDto extends AnalyticsRangeQueryDto {
    granularity: 'day' | 'week' | 'month';
}
export declare class AnalyticsUtmQueryDto extends AnalyticsRangeQueryDto {
    dimension: 'campaign' | 'adset' | 'ad';
}
