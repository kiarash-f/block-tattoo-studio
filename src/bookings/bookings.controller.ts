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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { ListBookingsQueryDto } from './dto/list-bookings.query.dto';
import type { AdminJwtPayload } from '../auth/jwt.strategy';

@ApiTags('Admin Bookings')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List booking requests (admin)' })
  list(@Query() query: ListBookingsQueryDto) {
    return this.bookings.list({
      status: query.status,
      q: query.q,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Booking request detail (admin)' })
  detail(@Param('id') id: string) {
    return this.bookings.detail(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status (admin)' })
  @ApiBody({ type: UpdateBookingStatusDto })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Req() req: any,
  ) {
    const user = req.user as AdminJwtPayload;
    return this.bookings.updateStatus(id, user.sub, dto);
  }
}
