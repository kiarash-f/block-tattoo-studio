import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { BookingAssignmentsService } from './booking-assignments.service';
import { CreateBookingAssignmentDto } from './dto/create-booking-assignment.dto';
import { UpdateBookingAssignmentDto } from './dto/update-booking-assignment.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Admin / Booking Assignments')
@ApiBearerAuth('admin-jwt')
@Controller('booking-requests/:bookingRequestId/assignments')
@UseGuards(AuthGuard('jwt'))
export class BookingAssignmentsController {
  constructor(private readonly assignments: BookingAssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create assignment for a booking request', description: 'Assigns an artist and/or studio station to a booking request for a specific session date.' })
  @ApiParam({
    name: 'bookingRequestId',
    description: 'BookingRequest ID (uuid)',
  })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  create(
    @Param('bookingRequestId') bookingRequestId: string,
    @Body() dto: CreateBookingAssignmentDto,
  ) {
    return this.assignments.create(bookingRequestId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List assignments for a booking request', description: 'Returns all artist/station assignments associated with the given booking request.' })
  @ApiParam({
    name: 'bookingRequestId',
    description: 'BookingRequest ID (uuid)',
  })
  @ApiResponse({ status: 200, description: 'List of assignments.' })
  list(@Param('bookingRequestId') bookingRequestId: string) {
    return this.assignments.list(bookingRequestId);
  }

  @Patch(':assignmentId')
  @ApiOperation({ summary: 'Update assignment', description: 'Updates the artist, station, or session details for an existing assignment.' })
  @ApiResponse({ status: 200, description: 'Assignment updated.' })
  @ApiResponse({ status: 404, description: 'Assignment not found.' })
  @ApiParam({
    name: 'bookingRequestId',
    description: 'BookingRequest ID (uuid)',
  })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID (cuid)' })
  update(
    @Param('bookingRequestId') bookingRequestId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateBookingAssignmentDto,
  ) {
    return this.assignments.update(bookingRequestId, assignmentId, dto);
  }

  @Delete(':assignmentId')
  @ApiOperation({ summary: 'Delete assignment', description: 'Removes an artist/station assignment from a booking request.' })
  @ApiResponse({ status: 200, description: 'Assignment deleted.' })
  @ApiResponse({ status: 404, description: 'Assignment not found.' })
  @ApiParam({
    name: 'bookingRequestId',
    description: 'BookingRequest ID (uuid)',
  })
  @ApiParam({ name: 'assignmentId', description: 'Assignment ID (cuid)' })
  remove(
    @Param('bookingRequestId') bookingRequestId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignments.remove(bookingRequestId, assignmentId);
  }
}
