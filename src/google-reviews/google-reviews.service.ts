import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

interface GoogleReview {
  authorName: string;
  authorPhotoUrl?: string;
  rating: number;
  text: string;
  time: number; // unix timestamp
  relativeTimeDescription: string;
}

export interface GoogleReviewsResponse {
  rating: number;
  totalRatings: number;
  reviews: GoogleReview[];
  cachedAt: string;
}

const CACHE_KEY = 'google_reviews';

@Injectable()
export class GoogleReviewsService {
  private readonly logger = new Logger(GoogleReviewsService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getReviews(): Promise<GoogleReviewsResponse> {
    try {
      const cached = await this.cache.get<GoogleReviewsResponse>(CACHE_KEY);
      if (cached) return cached;
    } catch (err) {
      this.logger.warn('Cache unavailable — fetching Google reviews directly');
    }

    const data = await this.fetchFromGoogle();

    try {
      const ttl = this.config.get<number>('GOOGLE_REVIEWS_CACHE_TTL') ?? 3600;
      await this.cache.set(CACHE_KEY, data, ttl * 1000);
    } catch (err) {
      this.logger.warn('Could not cache Google reviews — Redis may be down');
    }

    return data;
  }

  private async fetchFromGoogle(): Promise<GoogleReviewsResponse> {
    const apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY');
    const placeId = this.config.get<string>('GOOGLE_PLACE_ID');

    if (!apiKey || !placeId) {
      this.logger.warn(
        'GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID not set — returning empty reviews',
      );
      return {
        rating: 0,
        totalRatings: 0,
        reviews: [],
        cachedAt: new Date().toISOString(),
      };
    }

    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
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

    const json = (await res.json()) as {
      status: string;
      result?: {
        rating?: number;
        user_ratings_total?: number;
        reviews?: Array<{
          author_name: string;
          profile_photo_url?: string;
          rating: number;
          text: string;
          time: number;
          relative_time_description: string;
        }>;
      };
    };

    if (json.status !== 'OK' || !json.result) {
      this.logger.error(`Google Places API error: ${json.status}`);
      return {
        rating: 0,
        totalRatings: 0,
        reviews: [],
        cachedAt: new Date().toISOString(),
      };
    }

    const reviews: GoogleReview[] = (json.result.reviews ?? []).map((r) => ({
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
}
