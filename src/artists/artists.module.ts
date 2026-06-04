import { Module } from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { ArtistsController } from './artists.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TranslationModule } from '../translation/translation.module';

import { PublicArtistsController } from './public/public-artists.controller';
import { PublicArtistsService } from './public/public-artists.service';

import { MediaModule } from 'src/media/media.module';

@Module({
  imports: [PrismaModule, MediaModule, TranslationModule],
  providers: [ArtistsService, PublicArtistsService],
  controllers: [ArtistsController, PublicArtistsController],
  exports: [ArtistsService],
})
export class ArtistsModule {}
