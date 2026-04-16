import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GuestArtistBookingsService } from './guest-artist-bookings.service';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto';
import { UpdateGuestBookingDto } from './dto/update-guest-booking.dto';
import { ListGuestBookingsQueryDto } from './dto/list-guest-bookings.query.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

// ─── Public routes ────────────────────────────────────────────────────────────

@ApiTags('Guest Artist Bookings')
@Controller('guest-bookings')
export class GuestBookingsPublicController {
  constructor(private readonly service: GuestArtistBookingsService) {}

  @Get('availability')
  @ApiOperation({
    summary: 'Get table availability for a date range',
    description:
      'Returns available tables per day for the requested range. ' +
      'Days where availableTables = 0 are fully booked.',
  })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-06-01', description: 'ISO date YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate',   required: true, example: '2026-06-30', description: 'ISO date YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Availability per day.' })
  @ApiResponse({ status: 400, description: 'Invalid date range.' })
  getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.service.getAvailability(query.startDate, query.endDate);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a guest artist booking',
    description:
      'Books one or more tables for a guest artist. ' +
      'Validates availability for every day in the range. ' +
      'A 10% discount is applied automatically when the booking is 30+ days. ' +
      'Returns the booking details and a Shopify checkout URL (payment link).',
  })
  @ApiBody({ type: CreateGuestBookingDto })
  @ApiResponse({ status: 201, description: 'Booking created. Check shopifyCheckoutUrl for payment.' })
  @ApiResponse({ status: 400, description: 'Validation failed or not enough tables available.' })
  @ApiResponse({ status: 404, description: 'Station config not set up yet.' })
  create(@Body() dto: CreateGuestBookingDto) {
    return this.service.create(dto);
  }
}

// ─── Admin routes ─────────────────────────────────────────────────────────────

@ApiTags('Admin / Guest Bookings')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/guest-bookings')
export class GuestBookingsAdminController {
  constructor(private readonly service: GuestArtistBookingsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all guest artist bookings',
    description: 'Returns all bookings. Filterable by status and date range.',
  })
  @ApiResponse({ status: 200, description: 'List of bookings.' })
  list(@Query() query: ListGuestBookingsQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single guest booking' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Booking detail.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a guest booking',
    description:
      'Edit any field on a guest booking. ' +
      'If dates or numberOfTables change, totalPrice is automatically recalculated.',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateGuestBookingDto })
  @ApiResponse({ status: 200, description: 'Booking updated.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateGuestBookingDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a guest booking' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Booking deleted.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
