import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PublicService } from './public.service';
import { CreateBookingIntakeDto, IntakeSource } from './dto/booking-intake.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Public / Booking')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('booking-intake')
  @ApiOperation({
    summary: 'Public booking intake (multipart: payload + files[])',
    description: 'Submits a new booking request from the public website. Accepts a JSON payload field plus optional reference image uploads. Sends a confirmation email to the client.',
  })
  @ApiResponse({ status: 201, description: 'Booking intake submitted successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid payload, file type, or validation error.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['payload'],
      properties: {
        payload: {
          type: 'string',
          format: 'json',
          example: `{
  "client": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "123456789"
  },
  "bookingRequest": {
    "description": "Small tattoo on wrist",
    "budgetRange": "_200_400"
  },
  "medicalDeclaration": {
    "hasAllergies": false,
    "hasSkinCondition": false,
    "isPregnantOrNursing": false,
    "hasHeartCondition": false,
    "hasDiabetes": false,
    "takesBloodThinners": false,
    "takesMedication": false
  },
  "consent": {
    "isAdultConfirmed": true,
    "termsAccepted": true,
    "privacyAccepted": true
  }
}`,
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(), // ensures file.buffer exists
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    }),
  )
  async bookingIntake(
    @Body('payload') payload: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Query() query: any,
    @Headers() headers: Record<string, string>,
  ) {
    const payloadStr = typeof payload === 'string' ? payload.trim() : '';
    if (!payloadStr) throw new BadRequestException('Missing payload');

    // strict mimetype validation
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

    for (const f of files ?? []) {
      if (!allowedMimeTypes.has(f.mimetype)) {
        throw new BadRequestException(
          `Invalid file type for "${f.originalname}". Got "${f.mimetype}". Allowed: image/jpeg, image/png, image/webp`,
        );
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(payloadStr);
    } catch {
      throw new BadRequestException('Invalid JSON in payload');
    }

    parsed.bookingRequest ??= {};

    // bookingType default + public restriction
    parsed.bookingRequest.bookingType ??= 'APPOINTMENT';

    if (parsed.bookingRequest.bookingType === 'WALK_IN') {
      throw new BadRequestException(
        'WALK_IN can only be created in the studio (kiosk).',
      );
    }
    // ✅ preferred date range validation (optional fields)
    if (
      parsed.bookingRequest.preferredDateFrom ||
      parsed.bookingRequest.preferredDateTo
    ) {
      const from = parsed.bookingRequest.preferredDateFrom
        ? new Date(parsed.bookingRequest.preferredDateFrom)
        : null;

      const to = parsed.bookingRequest.preferredDateTo
        ? new Date(parsed.bookingRequest.preferredDateTo)
        : null;

      if (from && Number.isNaN(from.getTime())) {
        throw new BadRequestException('Invalid preferredDateFrom');
      }
      if (to && Number.isNaN(to.getTime())) {
        throw new BadRequestException('Invalid preferredDateTo');
      }
      if (from && to && to < from) {
        throw new BadRequestException(
          'preferredDateTo must be after preferredDateFrom',
        );
      }

      // (optional) normalize to ISO string to keep consistency
      if (from) parsed.bookingRequest.preferredDateFrom = from.toISOString();
      if (to) parsed.bookingRequest.preferredDateTo = to.toISOString();
    }

    // tracking fallbacks
    parsed.bookingRequest.utmCampaign ??=
      query.utm_campaign ?? query.utmCampaign;
    parsed.bookingRequest.utmAdset ??= query.utm_adset ?? query.utmAdset;
    parsed.bookingRequest.utmAd ??= query.utm_ad ?? query.utmAd;

    parsed.bookingRequest.referrer ??=
      headers['referer'] ?? headers['referrer'];
    parsed.bookingRequest.landingPath ??=
      headers['x-landing-path'] ?? query.landingPath;

    parsed.bookingRequest.source ??=
      (query.source as IntakeSource) ?? IntakeSource.DIRECT;

    // normalize preferredArtistName
    if (typeof parsed.bookingRequest.preferredArtistName === 'string') {
      const trimmed = parsed.bookingRequest.preferredArtistName.trim();
      parsed.bookingRequest.preferredArtistName = trimmed.length
        ? trimmed
        : undefined;
    }

    // if no artist => studio chooses
    if (!parsed.bookingRequest.preferredArtistName) {
      parsed.bookingRequest.studioChooses = true;
    }

    const dto = plainToInstance(CreateBookingIntakeDto, parsed);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) throw new BadRequestException(errors);

    return this.publicService.createBookingIntake(dto, files ?? []);
  }
}
