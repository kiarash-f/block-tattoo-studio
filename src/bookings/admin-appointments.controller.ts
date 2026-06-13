import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { ListAppointmentsQueryDto, AppointmentPeriod } from './dto/list-appointments.query.dto';

@ApiTags('Admin / Bookings')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/appointments')
export class AdminAppointmentsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Admin calendar — consults + tattoo sessions',
    description:
      'Returns all consults (PENDING_CONSULT, CONSULT_APPROVED) and tattoo sessions (TATTOO_SCHEDULED, COMPLETED) ' +
      'within the requested period. period=day|week|month|year, anchored on date (YYYY-MM-DD).',
  })
  @ApiResponse({ status: 200, description: 'Calendar events for the period.' })
  list(@Query() query: ListAppointmentsQueryDto) {
    return this.bookings.listAppointments({
      date: query.date,
      period: query.period ?? AppointmentPeriod.DAY,
      timezone: query.timezone ?? 'Europe/Berlin',
    });
  }
}
