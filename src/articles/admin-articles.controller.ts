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
  @ApiOperation({ summary: 'Create a new article (draft by default)' })
  create(@Body() dto: CreateArticleDto, @Req() req: any) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List articles (admin — all statuses)' })
  findAll(@Query() query: ListArticlesDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get article by id (admin)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update article' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish an article' })
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Revert article back to draft' })
  unpublish(@Param('id') id: string) {
    return this.service.unpublish(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete article' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
