import { Injectable } from '@nestjs/common';
import { BookingLinksService } from '../booking-links/booking-links.service';
import { PublicService } from '../public/public.service';
import { CreateBookingIntakeDto } from '../public/dto/booking-intake.dto';

@Injectable()
export class KioskService {
  constructor(
    private readonly publicService: PublicService,
    private readonly bookingLinks: BookingLinksService,
  ) {}

  async createWalkInIntakeWithQr(
    dto: CreateBookingIntakeDto,
    files: Express.Multer.File[],
  ) {
    // 1) Create booking intake using the same production logic
    const created = await this.publicService.createBookingIntake(dto, files);

    // 2) Create short-lived token (UPLOAD + VIEW) for QR
    const link = await this.bookingLinks.createToken({
      bookingRequestId: created.bookingRequestId,
      scopes: ['UPLOAD', 'VIEW'],
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    // 3) Return combined response (for tablet to render QR)
    return {
      bookingRequestId: created.bookingRequestId,
      status: created.status,
      createdAt: created.createdAt.toISOString?.() ?? String(created.createdAt),
      uploadUrl: link.url,
      uploadUrlExpiresAt: link.expiresAt.toISOString(),
    };
  }
}
