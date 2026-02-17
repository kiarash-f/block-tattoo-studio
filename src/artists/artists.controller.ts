import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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

import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { ListArtistsDto } from './dto/list-artists.dto';
import { AuthGuard } from '@nestjs/passport';


@ApiTags('Artists')
@ApiBearerAuth('admin-jwt')
@Controller('artists')
@UseGuards(AuthGuard('jwt'))
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new artist' })
  @ApiResponse({ status: 201, description: 'Artist created successfully' })
  @ApiResponse({ status: 400, description: 'Validation or uniqueness error' })
  create(@Body() dto: CreateArtistDto) {
    return this.artists.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List artists with filtering and pagination' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paged list of artists' })
  list(@Query() query: ListArtistsDto) {
    return this.artists.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get artist by ID' })
  @ApiParam({ name: 'id', description: 'Artist ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Artist found' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  findOne(@Param('id') id: string) {
    return this.artists.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update artist' })
  @ApiParam({ name: 'id', description: 'Artist ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Artist updated' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    return this.artists.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate artist (soft delete)' })
  @ApiParam({ name: 'id', description: 'Artist ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Artist deactivated' })
  deactivate(@Param('id') id: string) {
    return this.artists.deactivate(id);
  }
}
