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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
  @ApiOperation({
    summary: 'Create a new article (draft by default)',
    description:
      'Creates a new blog/news article in DRAFT status. The article is not publicly visible until published.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'How to Care for Your New Tattoo' },
        slug: { type: 'string' },
        excerpt: { type: 'string' },
        content: { type: 'string' },
        coverUrl: {
          type: 'string',
          description: 'URL fallback if no file is uploaded',
        },
        tags: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
        cover: {
          type: 'string',
          format: 'binary',
          description: 'Cover image file',
        },
      },
      required: ['title', 'content'],
    },
  })
  @ApiResponse({ status: 201, description: 'Article created.' })
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  create(
    @Body() dto: CreateArticleDto,
    @Req() req: any,
    @UploadedFile() cover?: Express.Multer.File,
  ) {
    return this.service.create(dto, req.user.sub, cover);
  }

  @Get()
  @ApiOperation({
    summary: 'List articles (admin — all statuses)',
    description:
      'Returns a paginated list of all articles including drafts and unpublished items. Supports filtering by status and text search.',
  })
  @ApiResponse({ status: 200, description: 'Paged list of articles.' })
  findAll(@Query() query: ListArticlesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get article by id (admin)',
    description: 'Returns a single article by ID regardless of publish status.',
  })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article found.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update article',
    description:
      'Updates article content, title, slug, or metadata fields. Optionally replaces the cover image.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        slug: { type: 'string' },
        excerpt: { type: 'string' },
        content: { type: 'string' },
        coverUrl: {
          type: 'string',
          description: 'URL fallback if no file is uploaded',
        },
        tags: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
        cover: {
          type: 'string',
          format: 'binary',
          description: 'Replaces the current cover image',
        },
      },
    },
  })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article updated.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @UploadedFile() cover?: Express.Multer.File,
  ) {
    return this.service.update(id, dto, cover);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish an article',
    description:
      'Sets the article status to PUBLISHED and sets publishedAt to the current timestamp, making it publicly visible.',
  })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article published.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Post(':id/unpublish')
  @ApiOperation({
    summary: 'Revert article back to draft',
    description:
      'Sets the article status back to DRAFT, removing it from public listings.',
  })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article reverted to draft.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete article',
    description: 'Permanently deletes an article.',
  })
  @ApiParam({ name: 'id', description: 'Article ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Article deleted.' })
  @ApiResponse({ status: 404, description: 'Article not found.' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
