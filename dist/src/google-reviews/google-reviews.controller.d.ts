import { GoogleReviewsService } from './google-reviews.service';
export declare class GoogleReviewsController {
    private readonly service;
    constructor(service: GoogleReviewsService);
    getReviews(): Promise<import("./google-reviews.service").GoogleReviewsResponse>;
}
