import { Body, Controller, Param, Post } from '@nestjs/common';
import { BookingLinksService } from './booking-links.service';
import { CreateBookingLinkDto } from './dto/create-booking-link.dto';
// import { Roles } from '../auth/roles.decorator'; // if you have RBAC
// import { UseGuards } from '@nestjs/common';

@Controller('admin/booking-requests')
export class BookingLinksController {
  constructor(private readonly tokens: BookingLinksService) {}

  @Post(':id/links')
  // @Roles('ADMIN')
  async createBookingLink(
    @Param('id') bookingRequestId: string,
    @Body() dto: CreateBookingLinkDto,
  ) {
    const result = await this.tokens.createToken({
      bookingRequestId,
      scopes: dto.scopes as any,
      expiresAt: new Date(dto.expiresAt),
      // createdByAdminId: req.user.id // add if you want
    });

    return {
      bookingRequestId,
      ...result,
    };
  }
}
