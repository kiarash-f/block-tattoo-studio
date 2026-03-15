import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';

@ApiTags('Admin / Articles')
@ApiBearerAuth('admin-jwt')
@Controller('admin/articles')
@UseGuards(AuthGuard('jwt'))
export class AdminArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new article (draft by default)', description: 'Creates a new blog/news article in DRAFT status. The article is not publicly visible until published.' })
  @ApiResponse({ status: 201, description: 'Article created.' })
  create(@Body() dto: CreateArticleDto, @Req() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List articles (admin — all statuses)', description: 'Returns a paginated list of all articles including drafts and unpublished items. Supports filtering by status and text search.' })
  @ApiResponse({ status: 200, description: 'Paged list of articles.' })
  findAll(@Query() query: ListArticlesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get article by id (admin)', description: 'Returns a single article by ID regardless of publish status.' })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article found.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update article', description: 'Updates article content, title, slug, or metadata fields.' })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article updated.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish an article', description: 'Sets the article status to PUBLISHED and sets publishedAt to the current timestamp, making it publicly visible.' })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article published.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Revert article back to draft', description: 'Sets the article status back to DRAFT, removing it from public listings.' })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article reverted to draft.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete article', description: 'Permanently deletes an article.' })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article deleted.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
