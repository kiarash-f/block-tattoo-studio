import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

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
    summary: 'Public booking intake',
    description:
      'Submits a new booking request from the public website. ' +
      'Send as multipart/form-data. All fields are individual form fields. ' +
      'Optionally attach reference images via files[]. Sends a confirmation email to the client.',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking intake submitted successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'firstName',
        'lastName',
        'consultDate',
        'description',
        'budgetRange',
      ],
      properties: {
        // ── Client ────────────────────────────────────────────────────────────
        firstName: {
          type: 'string',
          example: 'John',
          description: '(required) Client first name',
        },
        lastName: {
          type: 'string',
          example: 'Doe',
          description: '(required) Client last name',
        },
        email: {
          type: 'string',
          example: 'john@example.com',
          description: '(optional) Client email — used for confirmation email',
        },
        phone: {
          type: 'string',
          example: '+1234567890',
          description: '(optional) Client phone number',
        },
        instagram: {
          type: 'string',
          example: '@johndoe',
          description: '(optional) Client Instagram handle',
        },
        birthday: {
          type: 'string',
          example: '1995-06-15',
          description: '(optional) Client date of birth — ISO date YYYY-MM-DD',
        },

        // ── Booking request ───────────────────────────────────────────────────
        consultDate: {
          type: 'string',
          example: '2026-05-10',
          description:
            '(required) Chosen consult date — ISO date YYYY-MM-DD. Must be in the future and not a Sunday.',
        },
        description: {
          type: 'string',
          example: 'Small floral tattoo on wrist, black & grey style',
          description: '(required) Description of the desired tattoo',
        },
        budgetRange: {
          type: 'string',
          enum: [
            'UNDER_200',
            '_200_400',
            '_400_700',
            '_700_1000',
            '_1000_1500',
            '_1500_2000',
            'OVER_2000',
          ],
          example: '_200_400',
          description: '(required) Client budget range',
        },
        bookingType: {
          type: 'string',
          enum: ['APPOINTMENT', 'CONSULTATION', 'COVER_UP'],
          example: 'APPOINTMENT',
          description:
            '(optional) Type of booking. Defaults to APPOINTMENT. WALK_IN is not allowed from public form.',
        },
        placement: {
          type: 'string',
          example: 'Left wrist',
          description: '(optional) Where on the body the tattoo will go',
        },
        sizeDescription: {
          type: 'string',
          example: '5cm x 5cm',
          description: '(optional) Approximate size of the tattoo',
        },
        styleNotes: {
          type: 'string',
          example: 'Fine line, minimalist',
          description: '(optional) Style preferences',
        },
        referencesNotes: {
          type: 'string',
          example: 'See uploaded reference images',
          description: '(optional) Notes about reference images or inspiration',
        },
        preferredArtistName: {
          type: 'string',
          example: 'Alex',
          description:
            '(optional) Name of preferred artist. Leave empty to let the studio choose.',
        },
        preferredDateFrom: {
          type: 'string',
          example: '2026-06-01',
          description:
            '(optional) Earliest preferred tattoo date — ISO date YYYY-MM-DD',
        },
        preferredDateTo: {
          type: 'string',
          example: '2026-07-01',
          description:
            '(optional) Latest preferred tattoo date — ISO date YYYY-MM-DD',
        },
        preferredTimeOfDay: {
          type: 'string',
          enum: ['MORNING', 'AFTERNOON', 'EVENING', 'ANY'],
          example: 'AFTERNOON',
          description:
            '(optional) Preferred time of day for the tattoo appointment',
        },
        preferredDaysNote: {
          type: 'string',
          example: 'Prefer weekends',
          description: '(optional) Free-text note about preferred days',
        },

        // ── Files ─────────────────────────────────────────────────────────────
        images: {
          type: 'array',
          description:
            '(optional) Reference images — max 10 files, max 10 MB each. Allowed: jpeg, png, webp.',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
    }),
  )
  async bookingIntake(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
    @Query() query: any,
    @Headers() headers: Record<string, string>,
  ) {
    // strict mimetype validation
    const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    for (const f of files ?? []) {
      if (!allowedMimeTypes.has(f.mimetype)) {
        throw new BadRequestException(
          `Invalid file type for "${f.originalname}". Got "${f.mimetype}". Allowed: image/jpeg, image/png, image/webp`,
        );
      }
    }

    // Reconstruct the nested DTO from flat form fields
    const parsed: any = {
      client: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || undefined,
        phone: body.phone || undefined,
        instagram: body.instagram || undefined,
        birthday: body.birthday || undefined,
      },
      bookingRequest: {
        consultDate: body.consultDate,
        description: body.description,
        budgetRange: body.budgetRange,
        bookingType: body.bookingType || 'APPOINTMENT',
        placement: body.placement || undefined,
        sizeDescription: body.sizeDescription || undefined,
        styleNotes: body.styleNotes || undefined,
        referencesNotes: body.referencesNotes || undefined,
        preferredArtistName: body.preferredArtistName || undefined,
        preferredDateFrom: body.preferredDateFrom || undefined,
        preferredDateTo: body.preferredDateTo || undefined,
        preferredTimeOfDay: body.preferredTimeOfDay || undefined,
        preferredDaysNote: body.preferredDaysNote || undefined,
      },
    };

    // WALK_IN not allowed from public form
    if (parsed.bookingRequest.bookingType === 'WALK_IN') {
      throw new BadRequestException(
        'WALK_IN can only be created in the studio (kiosk).',
      );
    }

    // Preferred date range validation
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

      if (from && Number.isNaN(from.getTime()))
        throw new BadRequestException('Invalid preferredDateFrom');
      if (to && Number.isNaN(to.getTime()))
        throw new BadRequestException('Invalid preferredDateTo');
      if (from && to && to < from)
        throw new BadRequestException(
          'preferredDateTo must be after preferredDateFrom',
        );

      if (from) parsed.bookingRequest.preferredDateFrom = from.toISOString();
      if (to) parsed.bookingRequest.preferredDateTo = to.toISOString();
    }

    // Tracking fallbacks from query params / headers
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

    // Normalize preferredArtistName — empty string means studio chooses
    if (typeof parsed.bookingRequest.preferredArtistName === 'string') {
      const trimmed = parsed.bookingRequest.preferredArtistName.trim();
      parsed.bookingRequest.preferredArtistName = trimmed.length
        ? trimmed
        : undefined;
    }
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

  @Get('availability')
  @ApiOperation({
    summary: 'Get consult slot availability for a month',
    description:
      'Returns each day of the requested month with its availability status. ' +
      'Sundays are always closed. Days with 3+ booked consults are marked "busy" but still bookable — the admin can approve beyond the soft limit.',
  })
  @ApiQuery({
    name: 'month',
    required: true,
    example: '2026-05',
    description: 'Month in YYYY-MM format',
  })
  @ApiResponse({ status: 200, description: 'Availability map for the month' })
  getAvailability(@Query('month') month: string) {
    return this.publicService.getMonthAvailability(month);
  }
}
