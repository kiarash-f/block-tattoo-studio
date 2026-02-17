import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StudioStationsController } from './studio-stations.controller';
import { StudioStationsService } from './studio-stations.service';

@Module({
  imports: [PrismaModule],
  controllers: [StudioStationsController],
  providers: [StudioStationsService],
  exports: [StudioStationsService],
})
export class StudioStationsModule {}
