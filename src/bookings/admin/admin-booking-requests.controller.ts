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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SubmitInStudioFormDto } from './dto/in-studio-form.dto';
import { AdminBookingRequestsService } from './admin-booking-requests.service';

@ApiTags('Admin / Booking Requests')
@ApiBearerAuth('admin-jwt')
@Controller('admin/booking-requests')
@UseGuards(AuthGuard('jwt'))
export class AdminBookingRequestsController {
  constructor(private readonly service: AdminBookingRequestsService) {}

  @Post(':id/check-in')
  @ApiOperation({ summary: 'Check-in client in studio (admin-only)' })
  checkIn(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user?.sub; // your JWT payload uses sub
    return this.service.checkIn(id, adminId);
  }

  @Get(':id/in-studio-form')
  @ApiOperation({
    summary: 'Get in-studio medical+consent form state (admin-only)',
  })
  getInStudioForm(@Param('id') id: string) {
    return this.service.getInStudioForm(id);
  }

  @Put(':id/in-studio-form')
  @ApiOperation({
    summary: 'Submit in-studio medical+consent form (admin-only)',
  })
  submitInStudioForm(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: SubmitInStudioFormDto,
  ) {
    const adminId = req.user?.sub;
    return this.service.submitInStudioForm(id, adminId, dto);
  }
}
