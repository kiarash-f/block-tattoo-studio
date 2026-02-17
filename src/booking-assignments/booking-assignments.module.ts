import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingAssignmentsController } from './booking-assignments.controller';
import { BookingAssignmentsService } from './booking-assignments.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookingAssignmentsController],
  providers: [BookingAssignmentsService],
})
export class BookingAssignmentsModule {}
