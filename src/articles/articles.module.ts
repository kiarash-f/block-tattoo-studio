import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { ArticlesService } from './articles.service';
import { AdminArticlesController } from './admin-articles.controller';
import { PublicArticlesController } from './public-articles.controller';

@Module({
  imports: [PrismaModule, MediaModule],
  providers: [ArticlesService],
  controllers: [AdminArticlesController, PublicArticlesController],
})
export class ArticlesModule {}
