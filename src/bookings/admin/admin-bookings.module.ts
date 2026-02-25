import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminBookingRequestsController } from './admin-booking-requests.controller';
import { AdminBookingRequestsService } from './admin-booking-requests.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminBookingRequestsController],
  providers: [AdminBookingRequestsService],
})
export class AdminBookingsModule {}
