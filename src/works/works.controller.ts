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
  @ApiOperation({ summary: 'List works for an artist (all statuses)' })
  @ApiParam({ name: 'artistId', description: 'Artist ID (cuid)' })
  list(
    @Param('artistId') artistId: string,
    @Query() query: ListWorksDto,
  ) {
    return this.works.list(artistId, query);
  }

  @Patch(':workId')
  @ApiOperation({ summary: 'Update work title, tags, or publish status' })
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
  @ApiOperation({ summary: 'Delete a work' })
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
