import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { createKeyv } from '@keyv/redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { BookingsModule } from './bookings/bookings.module';
import { PublicModule } from './public/public.module';
import { MediaModule } from './media/media.module';
import { envValidationSchema } from './config/env.validation';
import { BookingLinksModule } from './booking-links/booking-links.module';
import { ArtistsModule } from './artists/artists.module';
import { StudioStationsModule } from './studio-stations/studio-stations.module';
import { BookingAssignmentsModule } from './booking-assignments/booking-assignments.module';
import { WorksModule } from './works/works.module';
import { ArticlesModule } from './articles/articles.module';
import { GoogleReviewsModule } from './google-reviews/google-reviews.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { EmailModule } from './email/email.module';
import { ChatModule } from './chat/chat.module';
import { StationConfigModule } from './station-config/station-config.module';
import { StripeModule } from './stripe/stripe.module';
import { PaymentsModule } from './payments/payments.module';
import { GuestArtistBookingsModule } from './guest-artist-bookings/guest-artist-bookings.module';
import { StripeWebhookModule } from './stripe-webhook/stripe-webhook.module';
import { TranslationModule } from './translation/translation.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { CampaignsModule } from './campaigns/campaigns.module';
@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    // ttl is MILLISECONDS in @nestjs/throttler v6. Global safety net of
    // 100 req/min per IP; sensitive routes override with tighter @Throttle
    // limits (login/intake 10/min, chat 20/min). Enforced by the APP_GUARD
    // ThrottlerGuard registered in `providers` below.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl =
          config.get<string>('REDIS_URL') ??
          (() => {
            const host = config.get<string>('REDIS_HOST') ?? 'localhost';
            const port = config.get<number>('REDIS_PORT') ?? 6379;
            const password = config.get<string>('REDIS_PASSWORD');
            return password
              ? `redis://:${password}@${host}:${port}`
              : `redis://${host}:${port}`;
          })();

        return {
          stores: [
            createKeyv(
              { url: redisUrl, socket: { connectTimeout: 3000 } },
              { throwOnConnectError: false },
            ),
          ],
        };
      },
    }),

    PrismaModule,
    AuthModule,
    AdminUsersModule,
    BookingsModule,
    PublicModule,
    MediaModule,
    HealthModule,
    BookingLinksModule,
    ArtistsModule,
    StudioStationsModule,
    BookingAssignmentsModule,
    WorksModule,
    ArticlesModule,
    GoogleReviewsModule,
    SchedulingModule,
    EmailModule,
    ChatModule,
    StationConfigModule,
    StripeModule,
    PaymentsModule,
    GuestArtistBookingsModule,
    StripeWebhookModule,
    TranslationModule,
    VouchersModule,
    CampaignsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
