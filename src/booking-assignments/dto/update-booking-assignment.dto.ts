import { PartialType } from '@nestjs/mapped-types';
import { CreateBookingAssignmentDto } from './create-booking-assignment.dto';

export class UpdateBookingAssignmentDto extends PartialType(
  CreateBookingAssignmentDto,
) {}
