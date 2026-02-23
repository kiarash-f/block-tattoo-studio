import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminAnalyticsModule } from './admin-analytics/admin-analytics.module';

@Module({
  controllers: [BookingsController, AdminAppointmentsController],
  providers: [BookingsService, PrismaService],
  exports: [BookingsService],
  imports: [AdminAnalyticsModule],
})
export class BookingsModule {}
