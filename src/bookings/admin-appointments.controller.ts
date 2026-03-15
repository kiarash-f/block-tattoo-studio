import { Controller , Get , Query , UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth , ApiTags , ApiOperation } from "@nestjs/swagger";
import { BookingsService } from "./bookings.service";
import { ListAppointmentsQueryDto } from "./dto/list-appointments.query.dto";



@ApiTags('Admin / Bookings')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/appointments')
export class AdminAppointmentsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List appointments for a day (by PRIMARY assignment startsAt)' })
  list(@Query() query: ListAppointmentsQueryDto) {
    return this.bookings.listDailyAppointments({
      date: query.date,
      timezone: query.timezone ?? 'Europe/Berlin',
      status: query.status,
      bookingType: query.bookingType,
      artistId: query.artistId,
      stationId: query.stationId,
    });
  }
}