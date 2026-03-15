import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { ListBookingsQueryDto } from './dto/list-bookings.query.dto';
import type { AdminJwtPayload } from '../auth/jwt.strategy';

@ApiTags('Admin / Bookings')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all booking requests', description: 'Returns paginated list of all booking requests. Filterable by status, search query, page, and limit.' })
  @ApiResponse({ status: 200, description: 'Paginated list of booking requests.' })
  list(@Query() query: ListBookingsQueryDto) {
    return this.bookings.list({
      status: query.status,
      q: query.q,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking request detail', description: 'Returns full detail of a single booking request including client info, assignments, uploads, and scheduling.' })
  @ApiResponse({ status: 200, description: 'Booking request found.' })
  @ApiResponse({ status: 404, description: 'Booking request not found.' })
  detail(@Param('id') id: string) {
    return this.bookings.detail(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status', description: 'Update the status of a booking request. Valid transitions: NEW → IN_REVIEW → APPROVED or REJECTED. Sending REJECTED triggers a rejection email to the client.' })
  @ApiBody({ type: UpdateBookingStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated successfully.' })
  @ApiResponse({ status: 404, description: 'Booking request not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Req() req: any,
  ) {
    const user = req.user as AdminJwtPayload;
    return this.bookings.updateStatus(id, user.sub, dto);
  }
}
