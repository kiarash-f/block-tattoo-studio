import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { ListArticlesDto } from './dto/list-articles.dto';

@ApiTags('Public / Articles')
@Controller('public/articles')
export class PublicArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'List published articles' })
  findAll(@Query() query: ListArticlesDto) {
    return this.service.findPublished(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published article by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}
