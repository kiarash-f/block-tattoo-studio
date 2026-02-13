import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule], // ✅ gives PublicModule access to MediaService
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
