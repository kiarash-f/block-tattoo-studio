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
import { AuthGuard } from '@nestjs/passport';
import { SchedulingService } from './scheduling.service';
import { CreateConsultSlotDto } from './dto/create-consult-slot.dto';
import { AssignConsultSlotDto } from './dto/assign-consult-slot.dto';
import { UpdateTattooSessionDto } from './dto/update-tattoo-session.dto';

// ─── Admin: Consult Slots ─────────────────────────────────────────────────────

@ApiTags('Admin / Consult Slots')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/consult-slots')
export class AdminConsultSlotsController {
  constructor(private readonly service: SchedulingService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a consult slot for a date',
    description:
      'Creates a new consultation slot with a defined capacity. Clients can be assigned to available slots during the booking process.',
  })
  @ApiResponse({ status: 201, description: 'Consult slot created.' })
  create(@Body() dto: CreateConsultSlotDto) {
    return this.service.createConsultSlot(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all consult slots with booking counts',
    description:
      'Returns all consult slots with their capacity, remaining availability, and number of bookings assigned.',
  })
  @ApiResponse({ status: 200, description: 'List of consult slots.' })
  list() {
    return this.service.listConsultSlots();
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a consult slot (only if no bookings assigned)',
    description:
      'Permanently deletes a consult slot. Fails if any bookings are already assigned to this slot.',
  })
  @ApiParam({ name: 'id', description: 'Consult slot ID' })
  @ApiResponse({ status: 200, description: 'Slot deleted.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete — bookings are assigned to this slot.',
  })
  @ApiResponse({ status: 404, description: 'Slot not found.' })
  remove(@Param('id') id: string) {
    return this.service.deleteConsultSlot(id);
  }
}

// ─── Admin: Assign Consult Slot to a Booking ─────────────────────────────────

@ApiTags('Admin / Consult Slots')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/bookings')
export class AdminBookingConsultController {
  constructor(private readonly service: SchedulingService) {}

  @Patch(':id/assign-consult')
  @ApiOperation({
    summary: 'Assign a consult slot to a booking',
    description:
      'Assigns a specific consult slot to a booking request, decrementing the slot capacity. Sends a confirmation email to the client.',
  })
  @ApiParam({ name: 'id', description: 'BookingRequest ID' })
  @ApiResponse({ status: 200, description: 'Consult slot assigned.' })
  @ApiResponse({
    status: 400,
    description: 'Slot is fully booked or booking is in wrong status.',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking request or slot not found.',
  })
  assign(@Param('id') id: string, @Body() dto: AssignConsultSlotDto) {
    return this.service.assignConsultSlot(id, dto);
  }
}

// ─── Admin: Tattoo Session Actions (by sessionId) ─────────────────────────────

@ApiTags('Admin / Tattoo Sessions')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/sessions')
export class AdminSessionActionsController {
  constructor(private readonly service: SchedulingService) {}

  @Patch(':sessionId')
  @ApiOperation({
    summary: 'Update a tattoo session',
    description:
      'Updates the scheduled date, duration, station, or notes for a tattoo session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Tattoo session ID' })
  @ApiResponse({ status: 200, description: 'Session updated.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  update(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateTattooSessionDto,
  ) {
    return this.service.updateTattooSession(sessionId, dto);
  }

  @Post(':sessionId/complete')
  @ApiOperation({
    summary: 'Mark a tattoo session as completed',
    description:
      'Sets the tattoo session status to COMPLETED and sends a session reminder/follow-up email to the client.',
  })
  @ApiParam({ name: 'sessionId', description: 'Tattoo session ID' })
  @ApiResponse({ status: 200, description: 'Session marked as completed.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  complete(@Param('sessionId') sessionId: string) {
    return this.service.completeTattooSession(sessionId);
  }

  @Delete(':sessionId')
  @ApiOperation({
    summary: 'Delete a tattoo session',
    description: 'Permanently deletes a tattoo session.',
  })
  @ApiParam({ name: 'sessionId', description: 'Tattoo session ID' })
  @ApiResponse({ status: 200, description: 'Session deleted.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  remove(@Param('sessionId') sessionId: string) {
    return this.service.deleteTattooSession(sessionId);
  }
}

// ─── Public: Availability ─────────────────────────────────────────────────────

@ApiTags('Public / Availability')
@Controller('public/availability')
export class PublicAvailabilityController {
  constructor(private readonly service: SchedulingService) {}

  @Get('consults')
  @ApiOperation({
    summary: 'Get available consult dates (dates with remaining capacity)',
    description:
      'Returns a list of upcoming consult dates that still have open capacity. Used by the public booking form to let clients select a preferred consultation date.',
  })
  @ApiResponse({ status: 200, description: 'List of available consult dates.' })
  getAvailableDates() {
    return this.service.getAvailableConsultDates();
  }
}
