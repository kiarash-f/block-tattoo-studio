import { Module } from '@nestjs/common';
import { GuestBookingsPublicController, GuestBookingsAdminController } from './guest-artist-bookings.controller';
import { GuestArtistBookingsService } from './guest-artist-bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { StationConfigModule } from '../station-config/station-config.module';

@Module({
  imports: [StationConfigModule],
  controllers: [GuestBookingsPublicController, GuestBookingsAdminController],
  providers: [GuestArtistBookingsService, PrismaService],
})
export class GuestArtistBookingsModule {}
