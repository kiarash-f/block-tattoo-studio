import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PublicTokenGuard } from './guards/public-token.guard';
import { TokenScopesGuard } from './guards/token-scopes.guard';
import { TokenScopes } from './decorators/token-scopes.decorator';
import { BookingsService } from '../bookings/bookings.service';
import { PublicUpdateIntakeDto } from './dto/public-update-intake.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadKind } from '@prisma/client';
import { BookingLinksUploadsService } from './uploads/booking-links-uploads.service';
import { PublicUploadDto } from './dto/public-upload.dto';

@ApiTags('Public / Booking')
@Controller('public/booking/:token')
@UseGuards(PublicTokenGuard, TokenScopesGuard)
@ApiParam({
  name: 'token',
  required: true,
  description: 'Compound token: <id>.<secret>',
})
export class PublicBookingController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly uploadSvc: BookingLinksUploadsService,
  ) {}

  @Get('intake')
  @ApiOperation({ summary: 'Get intake data via token (requires VIEW)', description: 'Returns the booking request intake data for the client associated with this token. Requires the VIEW scope.' })
  @ApiResponse({ status: 200, description: 'Intake data returned.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 403, description: 'Token lacks required VIEW scope.' })
  @TokenScopes('VIEW')
  async getIntake(@Req() req: Request) {
    const { bookingRequestId } = req.publicToken!;
    return this.bookings.getPublicIntake(bookingRequestId);
  }

  @Patch('intake')
  @ApiOperation({
    summary: 'Update intake via token (requires INTAKE_CONTINUE)',
    description: 'Allows the client to update their intake form (description, budget, preferred dates, etc.) via a tokenized link. Requires the INTAKE_CONTINUE scope.',
  })
  @ApiResponse({ status: 200, description: 'Intake updated.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 403, description: 'Token lacks required INTAKE_CONTINUE scope.' })
  @TokenScopes('INTAKE_CONTINUE')
  async updateIntake(@Req() req: Request, @Body() dto: PublicUpdateIntakeDto) {
    const { bookingRequestId } = req.publicToken!;
    return this.bookings.updatePublicIntake(bookingRequestId, dto);
  }

  @Post('uploads')
  @ApiOperation({ summary: 'Upload via token (requires UPLOAD)', description: 'Uploads reference or healed photos for a booking request using a tokenized link. Requires the UPLOAD scope.' })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'No files provided or invalid file type.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 403, description: 'Token lacks required UPLOAD scope.' })
  @TokenScopes('UPLOAD')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: Object.values(UploadKind) },
        note: { type: 'string' },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
    }),
  )
  async upload(
    @Req() req: Request,
    @UploadedFile() files: Express.Multer.File[],
    @Body() body: PublicUploadDto,
  ) {
    if (!files?.length) {
      throw new BadRequestException('no files uploaded');
    }
    const { bookingRequestId, tokenId } = req.publicToken!;
    const kind: UploadKind =
      body.kind && Object.values(UploadKind).includes(body.kind as UploadKind)
        ? (body.kind as UploadKind)
        : UploadKind.REFERENCE;

    return this.uploadSvc.uploadForBookingViaToken({
      bookingRequestId,
      tokenId,
      kind,
      note: body.note,
      files,
    });
  }
}
