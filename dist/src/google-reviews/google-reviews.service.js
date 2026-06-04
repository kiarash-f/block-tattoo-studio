"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GoogleReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleReviewsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const CACHE_KEY = 'google_reviews';
let GoogleReviewsService = GoogleReviewsService_1 = class GoogleReviewsService {
    config;
    cache;
    logger = new common_1.Logger(GoogleReviewsService_1.name);
    constructor(config, cache) {
        this.config = config;
        this.cache = cache;
    }
    async getReviews() {
        try {
            const cached = await this.withTimeout(this.cache.get(CACHE_KEY), 2000);
            if (cached)
                return cached;
        }
        catch {
            this.logger.warn('Cache unavailable — fetching Google reviews directly');
        }
        const data = await this.fetchFromGoogle();
        try {
            const ttl = this.config.get('GOOGLE_REVIEWS_CACHE_TTL') ?? 3600;
            await this.withTimeout(this.cache.set(CACHE_KEY, data, ttl * 1000), 2000);
        }
        catch {
            this.logger.warn('Could not store Google reviews in cache');
        }
        return data;
    }
    withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('cache timeout')), ms)),
        ]);
    }
    async fetchFromGoogle() {
        const apiKey = this.config.get('GOOGLE_PLACES_API_KEY');
        const placeId = this.config.get('GOOGLE_PLACE_ID');
        if (!apiKey || !placeId) {
            this.logger.warn('GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID not set — returning empty reviews');
            return {
                rating: 0,
                totalRatings: 0,
                reviews: [],
                cachedAt: new Date().toISOString(),
            };
        }
        const url = `https://maps.googleapis.com/maps/api/place/details/json` +
            `?place_id=${encodeURIComponent(placeId)}` +
            `&fields=rating,user_ratings_total,reviews` +
            `&reviews_sort=newest` +
            `&key=${apiKey}`;
        const res = await fetch(url);
        if (!res.ok) {
            this.logger.error(`Google Places API responded with ${res.status}`);
            return {
                rating: 0,
                totalRatings: 0,
                reviews: [],
                cachedAt: new Date().toISOString(),
            };
        }
        const json = (await res.json());
        if (json.status !== 'OK' || !json.result) {
            this.logger.error(`Google Places API error: ${json.status}`);
            return {
                rating: 0,
                totalRatings: 0,
                reviews: [],
                cachedAt: new Date().toISOString(),
            };
        }
        const reviews = (json.result.reviews ?? [])
            .filter((r) => r.text?.trim())
            .slice(0, 5)
            .map((r) => ({
            authorName: r.author_name,
            authorPhotoUrl: r.profile_photo_url,
            rating: r.rating,
            text: r.text,
            time: r.time,
            relativeTimeDescription: r.relative_time_description,
        }));
        return {
            rating: json.result.rating ?? 0,
            totalRatings: json.result.user_ratings_total ?? 0,
            reviews,
            cachedAt: new Date().toISOString(),
        };
    }
};
exports.GoogleReviewsService = GoogleReviewsService;
exports.GoogleReviewsService = GoogleReviewsService = GoogleReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        cache_manager_1.Cache])
], GoogleReviewsService);
//# sourceMappingURL=google-reviews.service.js.map