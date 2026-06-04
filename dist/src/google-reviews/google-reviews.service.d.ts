import { ConfigService } from '@nestjs/config';
import { Cache } from '@nestjs/cache-manager';
interface GoogleReview {
    authorName: string;
    authorPhotoUrl?: string;
    rating: number;
    text: string;
    time: number;
    relativeTimeDescription: string;
}
export interface GoogleReviewsResponse {
    rating: number;
    totalRatings: number;
    reviews: GoogleReview[];
    cachedAt: string;
}
export declare class GoogleReviewsService {
    private readonly config;
    private readonly cache;
    private readonly logger;
    constructor(config: ConfigService, cache: Cache);
    getReviews(): Promise<GoogleReviewsResponse>;
    private withTimeout;
    private fetchFromGoogle;
}
export {};
