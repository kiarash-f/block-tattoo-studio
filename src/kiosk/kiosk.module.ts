import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KioskController } from './kiosk.controller';
import { KioskService } from './kiosk.service';
import { KioskKeyGuard } from './guards/kiosk-key.guard';
import { PublicModule } from '../public/public.module';
import { BookingLinksModule } from '../booking-links/booking-links.module';

@Module({
  imports: [ConfigModule, PublicModule, BookingLinksModule],
  controllers: [KioskController],
  providers: [KioskService, KioskKeyGuard],
})
export class KioskModule {}
