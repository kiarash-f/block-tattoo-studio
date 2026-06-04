import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GuestBookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuestBookingExpiryService {
  private readonly logger = new Logger(GuestBookingExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Runs every hour — expires bookings stuck in PENDING_PAYMENT for over 24 hours */
  @Cron('0 * * * *')
  async expireStaleBookings(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const result = await this.prisma.guestArtistBooking.updateMany({
      where: {
        status: GuestBookingStatus.PENDING_PAYMENT,
        createdAt: { lt: cutoff },
      },
      data: { status: GuestBookingStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(
        `Expired ${result.count} stale PENDING_PAYMENT booking(s) older than 24 hours`,
      );
    }
  }
}
