import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 20,
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST') ?? 'localhost';
        const port = config.get<number>('REDIS_PORT') ?? 6379;
        const password = config.get<string>('REDIS_PASSWORD');

        const redisUrl = password
          ? `redis://:${password}@${host}:${port}`
          : `redis://${host}:${port}`;

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
  ],
})
export class AppModule {}
