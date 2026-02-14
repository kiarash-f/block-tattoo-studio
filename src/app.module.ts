import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { BookingsModule } from './bookings/bookings.module';
import { PublicModule } from './public/public.module';
import { MediaModule } from './media/media.module';
import { envValidationSchema } from './config/env.validation';
import { BookingLinksModule } from './booking-links/booking-links.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60, // time window in seconds
        limit: 20, // max requests per window
      },
    ]),

    PrismaModule,
    AuthModule,
    AdminUsersModule,
    BookingsModule,
    PublicModule,
    MediaModule,
    HealthModule,
    BookingLinksModule,
  ],
})
export class AppModule {}
