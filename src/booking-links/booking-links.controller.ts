import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingLinksService } from './booking-links.service';
import { CreateBookingLinkDto } from './dto/create-booking-link.dto';
import type { AdminJwtPayload } from '../auth/jwt.strategy'; // adjust path if needed

@ApiTags('Admin Booking Links')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/booking-requests')
export class BookingLinksController {
  constructor(private readonly tokens: BookingLinksService) {}

  @Post(':id/links')
  @ApiOperation({ summary: 'Create tokenized booking link (admin)' })
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
      // createdByAdminId: user.sub, // enable if you added this column in Prisma
    });

    return {
      bookingRequestId,
      ...result,
    };
  }
}
