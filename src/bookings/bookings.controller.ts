import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { ListBookingsQueryDto } from './dto/list-bookings.query.dto';
import type { AdminJwtPayload } from '../auth/jwt.strategy';

class ScheduleTattooDto {
  @ApiProperty({ example: '2026-05-20T14:00:00.000Z' })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ example: 'artist-cuid' })
  @IsString()
  artistId: string;

  @ApiPropertyOptional({ example: 'station-cuid' })
  @IsOptional()
  @IsString()
  stationId?: string;

  @ApiPropertyOptional({ example: '3-4 hours' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  durationNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

@ApiTags('Admin / Bookings')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all booking requests',
    description:
      'Returns paginated list of all booking requests. Filterable by status, search query, page, and limit.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of booking requests.',
  })
  list(@Query() query: ListBookingsQueryDto) {
    return this.bookings.list({
      status: query.status,
      q: query.q,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post('walk-in')
  @ApiOperation({
    summary: 'Create a walk-in booking (admin/tablet)',
    description:
      'Creates a walk-in booking directly at TATTOO_SCHEDULED status. ' +
      'Accepts basic client info, tattoo date, artist, and optional reference images. ' +
      'Returns an upload token so the client can add more images on the tablet.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'firstName',
        'lastName',
        'description',
        'tattooDate',
        'artistId',
      ],
      properties: {
        firstName: { type: 'string', example: 'Jane' },
        lastName: { type: 'string', example: 'Doe' },
        email: { type: 'string', example: 'jane@example.com' },
        phone: { type: 'string', example: '+49123456789' },
        instagram: { type: 'string', example: '@jane' },
        description: { type: 'string', example: 'Small rose on wrist' },
        placement: { type: 'string', example: 'left wrist' },
        sizeDescription: { type: 'string', example: '5x5 cm' },
        styleNotes: { type: 'string', example: 'blackwork' },
        tattooDate: {
          type: 'string',
          format: 'date-time',
          example: '2026-04-14T14:00:00.000Z',
          description: 'ISO date — use today for same-day tattoo',
        },
        artistId: { type: 'string' },
        stationId: { type: 'string' },
        budgetRange: {
          type: 'string',
          enum: [
            'UNDER_200',
            'B200_400',
            'B400_700',
            'B700_1000',
            'B1000_1500',
            'B1500_2000',
            'OVER_2000',
          ],
          example: 'B200_400',
          description: 'Client budget range (optional, defaults to UNDER_200)',
        },
        durationNote: { type: 'string', example: '2-3 hours' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Reference images (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Walk-in created. Returns bookingId and upload token for tablet.',
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 10 }], {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  createWalkIn(
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ) {
    const user = req.user as AdminJwtPayload;
    const tattooDate = new Date(body.tattooDate);
    if (Number.isNaN(tattooDate.getTime())) {
      throw new Error('Invalid tattooDate');
    }
    return this.bookings.createWalkIn(
      user.sub,
      {
        client: {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email || undefined,
          phone: body.phone || undefined,
          instagram: body.instagram || undefined,
        },
        description: body.description,
        budgetRange: body.budgetRange || undefined,
        tattooDate,
        artistId: body.artistId,
        stationId: body.stationId || undefined,
        durationNote: body.durationNote || undefined,
        placement: body.placement || undefined,
        sizeDescription: body.sizeDescription || undefined,
        styleNotes: body.styleNotes || undefined,
      },
      files?.images ?? [],
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get booking request detail',
    description:
      'Returns full detail of a single booking request including client info, assignments, uploads, tattoo sessions, and scheduling.',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Booking request found.' })
  @ApiResponse({ status: 404, description: 'Booking request not found.' })
  detail(@Param('id') id: string) {
    return this.bookings.detail(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update booking status',
    description:
      'Valid transitions: PENDING_CONSULT → CONSULT_APPROVED | CANCELLED. ' +
      'CONSULT_APPROVED → CONSULT_NO_SHOW | CANCELLED. ' +
      'TATTOO_SCHEDULED → COMPLETED | CANCELLED. ' +
      'To move to TATTOO_SCHEDULED use POST /:id/schedule-tattoo.',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: UpdateBookingStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  @ApiResponse({ status: 400, description: 'Invalid transition.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Req() req: any,
  ) {
    const user = req.user as AdminJwtPayload;
    return this.bookings.updateStatus(id, user.sub, dto);
  }

  @Post(':id/schedule-tattoo')
  @ApiOperation({
    summary: 'Schedule tattoo session after consultation',
    description:
      'Creates a TattooSession and moves the booking from CONSULT_APPROVED → TATTOO_SCHEDULED. ' +
      'If scheduledDate is today the client should fill medical/consent immediately after.',
  })
  @ApiParam({ name: 'id' })
  @ApiBody({ type: ScheduleTattooDto })
  @ApiResponse({ status: 201, description: 'Tattoo session scheduled.' })
  @ApiResponse({
    status: 400,
    description: 'Booking not in CONSULT_APPROVED status.',
  })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  scheduleTattoo(@Param('id') id: string, @Body() dto: ScheduleTattooDto) {
    return this.bookings.scheduleTattooSession(id, {
      scheduledDate: new Date(dto.scheduledDate),
      artistId: dto.artistId,
      stationId: dto.stationId,
      durationNote: dto.durationNote,
      notes: dto.notes,
    });
  }
}
