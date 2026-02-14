import { Module } from '@nestjs/common';
import { BookingLinksService } from './booking-links.service';
import { BookingLinksController } from './booking-links.controller';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [BookingLinksService, PrismaService],
  controllers: [BookingLinksController],
  exports: [BookingLinksService],
})
export class BookingLinksModule {}
