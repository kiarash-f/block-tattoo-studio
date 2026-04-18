import { Module } from '@nestjs/common';
import {
  GuestBookingsPublicController,
  GuestBookingsAdminController,
} from './guest-artist-bookings.controller';
import { GuestArtistBookingsService } from './guest-artist-bookings.service';
import { GuestBookingExpiryService } from './guest-booking-expiry.service';
import { PrismaService } from '../prisma/prisma.service';
import { StationConfigModule } from '../station-config/station-config.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [StationConfigModule, StripeModule],
  controllers: [GuestBookingsPublicController, GuestBookingsAdminController],
  providers: [GuestArtistBookingsService, GuestBookingExpiryService, PrismaService],
})
export class GuestArtistBookingsModule {}
