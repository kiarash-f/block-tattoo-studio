import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { ListArticlesDto } from './dto/list-articles.dto';

@ApiTags('Public / Articles')
@Controller('public/articles')
export class PublicArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'List published articles', description: 'Returns a paginated list of publicly visible (PUBLISHED) articles for the blog/news feed.' })
  @ApiResponse({ status: 200, description: 'Paged list of published articles.' })
  findAll(@Query() query: ListArticlesDto) {
    return this.service.findPublished(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get published article by slug', description: 'Returns a single published article by its URL slug. Returns 404 if the article is not found or not published.' })
  @ApiParam({ name: 'slug', description: 'Article URL slug' })
  @ApiResponse({ status: 200, description: 'Article found.' })
  @ApiResponse({ status: 404, description: 'Article not found or not published.' })
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}
