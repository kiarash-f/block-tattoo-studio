import { Module } from '@nestjs/common';
import { StationConfigController } from './station-config.controller';
import { StationConfigService } from './station-config.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [StationConfigController],
  providers: [StationConfigService, PrismaService],
  exports: [StationConfigService],
})
export class StationConfigModule {}
