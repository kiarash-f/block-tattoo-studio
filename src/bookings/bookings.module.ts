import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';
import { AdminBookingsModule } from './admin/admin-bookings.module';
import { MediaModule } from '../media/media.module';
import { PaymentsModule } from '../payments/payments.module';
import { SessionWindowModule } from '../scheduling/session-window.module';

@Module({
  controllers: [BookingsController, AdminAppointmentsController],
  providers: [BookingsService, PrismaService],
  exports: [BookingsService],
  imports: [
    AdminAnalyticsModule,
    AdminBookingsModule,
    MediaModule,
    PaymentsModule,
    SessionWindowModule,
  ],
})
export class BookingsModule {}
