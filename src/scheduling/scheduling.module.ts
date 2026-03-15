import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulingService } from './scheduling.service';
import {
  AdminConsultSlotsController,
  AdminBookingConsultController,
  AdminTattooSessionsController,
  AdminSessionActionsController,
  PublicAvailabilityController,
} from './scheduling.controller';

@Module({
  imports: [PrismaModule],
  providers: [SchedulingService],
  controllers: [
    AdminConsultSlotsController,
    AdminBookingConsultController,
    AdminTattooSessionsController,
    AdminSessionActionsController,
    PublicAvailabilityController,
  ],
})
export class SchedulingModule {}
