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
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SchedulingService } from './scheduling.service';
import { CreateConsultSlotDto } from './dto/create-consult-slot.dto';
import { AssignConsultSlotDto } from './dto/assign-consult-slot.dto';
import { CreateTattooSessionDto } from './dto/create-tattoo-session.dto';
import { UpdateTattooSessionDto } from './dto/update-tattoo-session.dto';

// ─── Admin: Consult Slots ─────────────────────────────────────────────────────

@ApiTags('Admin / Consult Slots')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/consult-slots')
export class AdminConsultSlotsController {
  constructor(private readonly service: SchedulingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a consult slot for a date' })
  create(@Body() dto: CreateConsultSlotDto) {
    return this.service.createConsultSlot(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all consult slots with booking counts' })
  list() {
    return this.service.listConsultSlots();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a consult slot (only if no bookings assigned)' })
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
  @ApiOperation({ summary: 'Assign a consult slot to a booking' })
  assign(@Param('id') id: string, @Body() dto: AssignConsultSlotDto) {
    return this.service.assignConsultSlot(id, dto);
  }
}

// ─── Admin: Tattoo Sessions ───────────────────────────────────────────────────

@ApiTags('Admin / Tattoo Sessions')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/bookings')
export class AdminTattooSessionsController {
  constructor(private readonly service: SchedulingService) {}

  @Post(':id/sessions')
  @ApiOperation({
    summary: 'Create a tattoo session for a booking (station auto-resolved)',
  })
  create(@Param('id') id: string, @Body() dto: CreateTattooSessionDto) {
    return this.service.createTattooSession(id, dto);
  }

  @Get(':id/sessions')
  @ApiOperation({ summary: 'List all tattoo sessions for a booking' })
  list(@Param('id') id: string) {
    return this.service.listTattooSessions(id);
  }
}

@ApiTags('Admin / Tattoo Sessions')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/sessions')
export class AdminSessionActionsController {
  constructor(private readonly service: SchedulingService) {}

  @Patch(':sessionId')
  @ApiOperation({ summary: 'Update a tattoo session' })
  update(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateTattooSessionDto,
  ) {
    return this.service.updateTattooSession(sessionId, dto);
  }

  @Post(':sessionId/complete')
  @ApiOperation({ summary: 'Mark a tattoo session as completed' })
  complete(@Param('sessionId') sessionId: string) {
    return this.service.completeTattooSession(sessionId);
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: 'Delete a tattoo session' })
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
  })
  getAvailableDates() {
    return this.service.getAvailableConsultDates();
  }
}
