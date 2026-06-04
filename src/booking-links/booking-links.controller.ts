import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookingLinksService } from './booking-links.service';
import { CreateBookingLinkDto } from './dto/create-booking-link.dto';
import type { AdminJwtPayload } from '../auth/jwt.strategy';

@ApiTags('Admin / Booking Links')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/booking-requests')
export class BookingLinksController {
  constructor(private readonly tokens: BookingLinksService) {}

  @Post(':id/links')
  @ApiOperation({
    summary: 'Create tokenized booking link (admin)',
    description:
      'Generates a short-lived, scoped token URL that allows a client to take specific actions on their booking request without logging in.',
  })
  @ApiParam({ name: 'id', description: 'BookingRequest ID' })
  @ApiResponse({
    status: 201,
    description: 'Booking link created. Returns token and expiry.',
  })
  @ApiResponse({ status: 404, description: 'Booking request not found.' })
  async createBookingLink(
    @Param('id') bookingRequestId: string,
    @Body() dto: CreateBookingLinkDto,
    @Req() req: any,
  ) {
    const user = req.user as AdminJwtPayload;

    const result = await this.tokens.createToken({
      bookingRequestId,
      scopes: dto.scopes as any,
      expiresAt: new Date(dto.expiresAt),
      createdByAdminId: user.sub,
    });

    return {
      bookingRequestId,
      ...result,
    };
  }
}
