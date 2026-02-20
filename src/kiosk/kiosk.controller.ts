import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { KioskService } from './kiosk.service';
import { KioskKeyGuard } from './guards/kiosk-key.guard';
import {
  CreateBookingIntakeDto,
  IntakeSource,
} from '../public/dto/booking-intake.dto';
import { KioskBookingIntakeResponseDto } from './dto/kiosk-booking-intake.response.dto';

@ApiTags('Kiosk')
@ApiSecurity('kiosk-key')
@UseGuards(KioskKeyGuard)
@Controller('kiosk')
export class KioskController {
  constructor(private readonly kioskService: KioskService) {}

  @Throttle({ default: { limit: 60, ttl: 60 } })
  @Post('booking-intake')
  @ApiOperation({
    summary:
      'Kiosk walk-in intake (multipart: payload + files[]) + returns QR upload URL',
    description:
      'Creates a WALK_IN booking request from the studio tablet and returns a tokenized upload URL that should be rendered as a QR code for the client to scan.',
  })
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
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "015112345678"
  },
  "bookingRequest": {
    "description": "Walk-in tattoo request",
    "budgetRange": "B200_400",
    "source": "DIRECT"
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
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiOkResponse({ type: KioskBookingIntakeResponseDto })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async kioskBookingIntake(
    @Body('payload') payload: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Query() query: any,
    @Headers() headers: Record<string, string>,
  ) {
    const payloadStr = typeof payload === 'string' ? payload.trim() : '';
    if (!payloadStr) throw new BadRequestException('Missing payload');

    // same strict mimetype validation as public
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

    // tracking fallbacks (same approach as public)
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

    // IMPORTANT: force walk-in
    parsed.bookingRequest.bookingType = 'WALK_IN';

    const dto = plainToInstance(CreateBookingIntakeDto, parsed);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) throw new BadRequestException(errors);

    return this.kioskService.createWalkInIntakeWithQr(dto, files ?? []);
  }
}
