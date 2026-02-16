import { Module } from '@nestjs/common';
import { BookingLinksService } from './booking-links.service';
import { BookingLinksController } from './booking-links.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { PublicBookingController } from './public-booking.controller';
import { PublicTokenGuard } from './guards/public-token.guard';
import { TokenScopesGuard } from './guards/token-scopes.guard';
import { BookingsModule } from '../bookings/bookings.module';
import { BookingLinksUploadsService } from './uploads/booking-links-uploads.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [ConfigModule, BookingsModule, MediaModule],
  providers: [
    BookingLinksService,
    PrismaService,
    PublicTokenGuard,
    TokenScopesGuard,
    BookingLinksUploadsService,
  ],
  controllers: [BookingLinksController, PublicBookingController],
  exports: [BookingLinksService],
})
export class BookingLinksModule {}
