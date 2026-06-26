import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulingService } from './scheduling.service';
import { SessionWindowModule } from './session-window.module';
import {
  AdminConsultSlotsController,
  AdminBookingConsultController,
  AdminSessionActionsController,
  PublicAvailabilityController,
} from './scheduling.controller';

@Module({
  imports: [PrismaModule, SessionWindowModule],
  providers: [SchedulingService],
  controllers: [
    AdminConsultSlotsController,
    AdminBookingConsultController,
    AdminSessionActionsController,
    PublicAvailabilityController,
  ],
})
export class SchedulingModule {}
