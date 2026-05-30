import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { ArticlesService } from './articles.service';
import { AdminArticlesController } from './admin-articles.controller';
import { PublicArticlesController } from './public-articles.controller';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [PrismaModule, MediaModule, TranslationModule],
  providers: [ArticlesService],
  controllers: [AdminArticlesController, PublicArticlesController],
})
export class ArticlesModule {}
