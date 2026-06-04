import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SubmitInStudioFormDto } from './dto/in-studio-form.dto';
import { AdminBookingRequestsService } from './admin-booking-requests.service';

@ApiTags('Admin / Bookings')
@ApiBearerAuth('admin-jwt')
@Controller('admin/booking-requests')
@UseGuards(AuthGuard('jwt'))
export class AdminBookingRequestsController {
  constructor(private readonly service: AdminBookingRequestsService) {}

  @Post(':id/check-in')
  @ApiOperation({
    summary: 'Check in client on arrival',
    description:
      'Marks the client as checked in to the studio. Sets checkedInAt timestamp and records which admin performed the check-in.',
  })
  @ApiResponse({ status: 201, description: 'Client checked in successfully.' })
  @ApiResponse({ status: 404, description: 'Booking request not found.' })
  checkIn(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user?.sub; // your JWT payload uses sub
    return this.service.checkIn(id, adminId);
  }

  @Get(':id/in-studio-form')
  @ApiOperation({
    summary: 'Get in-studio medical and consent form',
    description:
      'Returns the current state of the medical declaration and consent form for a booking. Returns null for each if not yet submitted.',
  })
  @ApiResponse({ status: 200, description: 'Form state returned.' })
  @ApiResponse({ status: 404, description: 'Booking request not found.' })
  getInStudioForm(@Param('id') id: string) {
    return this.service.getInStudioForm(id);
  }

  @Put(':id/in-studio-form')
  @ApiOperation({
    summary: 'Submit in-studio medical and consent form',
    description:
      'Admin submits the medical declaration and consent form on behalf of the client during the studio visit. Overwrites any existing submission.',
  })
  @ApiResponse({ status: 200, description: 'Form submitted successfully.' })
  @ApiResponse({ status: 404, description: 'Booking request not found.' })
  submitInStudioForm(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: SubmitInStudioFormDto,
  ) {
    const adminId = req.user?.sub;
    return this.service.submitInStudioForm(id, adminId, dto);
  }
}
