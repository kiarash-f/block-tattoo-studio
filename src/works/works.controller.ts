import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WorksService } from './works.service';
import { UpdateWorkDto } from './dto/update-work.dto';
import { ListWorksDto } from './dto/list-works.dto';

@ApiTags('Admin / Artist Works')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('artists/:artistId/works')
export class WorksController {
  constructor(private readonly works: WorksService) {}

  @Get()
  @ApiOperation({ summary: 'List works for an artist (all statuses)', description: 'Returns all portfolio works for an artist, including draft and unpublished items. Supports filtering and pagination.' })
  @ApiParam({ name: 'artistId', description: 'Artist ID (cuid)' })
  @ApiResponse({ status: 200, description: 'List of works.' })
  list(
    @Param('artistId') artistId: string,
    @Query() query: ListWorksDto,
  ) {
    return this.works.list(artistId, query);
  }

  @Patch(':workId')
  @ApiOperation({ summary: 'Update work title, tags, or publish status', description: 'Updates metadata or publish status for a specific portfolio work. Use to publish/unpublish or retag a work.' })
  @ApiParam({ name: 'artistId', description: 'Artist ID (cuid)' })
  @ApiParam({ name: 'workId', description: 'Work ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Work updated' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  update(
    @Param('artistId') artistId: string,
    @Param('workId') workId: string,
    @Body() dto: UpdateWorkDto,
  ) {
    return this.works.update(artistId, workId, dto);
  }

  @Delete(':workId')
  @ApiOperation({ summary: 'Delete a work', description: 'Permanently deletes a portfolio work and its associated media files.' })
  @ApiParam({ name: 'artistId', description: 'Artist ID (cuid)' })
  @ApiParam({ name: 'workId', description: 'Work ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Work deleted' })
  @ApiResponse({ status: 404, description: 'Work not found' })
  remove(
    @Param('artistId') artistId: string,
    @Param('workId') workId: string,
  ) {
    return this.works.remove(artistId, workId);
  }
}
