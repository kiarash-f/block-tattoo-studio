import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ArtistsService } from './artists.service';
import { ListArtistsDto } from './dto/list-artists.dto';
import { AdminCreateArtistMultipartDto } from './dto/admin-create-artist.multipart.dto';
import { AdminUpdateArtistMultipartDto } from './dto/admin-update-artist.multipart.dto';

@ApiTags('Admin / Artists')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new artist (multipart: cover + works)', description: 'Creates a new artist profile with optional cover image and portfolio work uploads. Accepts multipart/form-data.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover', maxCount: 1 },
        { name: 'works', maxCount: 50 },
      ],
      {
        storage: memoryStorage(), // IMPORTANT: enables file.buffer for uploadBuffer()
        limits: {
          fileSize: 15 * 1024 * 1024, // 15MB per file (adjust if needed)
        },
      },
    ),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string', example: 'Alex Ink' },
        handle: { type: 'string', example: 'alex-ink' },
        slug: { type: 'string', example: 'alex-ink' },
        email: { type: 'string', example: 'alex@example.com' },
        phone: { type: 'string', example: '+4912345678' },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
        bio: { type: 'string' },
        avatarUrl: { type: 'string' },

        worksMeta: {
          type: 'string',
          description:
            'JSON string array aligned with uploaded works. Example: [{"title":"Rose","tags":["blackwork"]}]',
          example: '[{"title":"Rose","tags":["blackwork"]}]',
        },

        cover: { type: 'string', format: 'binary' },
        works: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['displayName'],
    },
  })
  @ApiResponse({ status: 201, description: 'Artist created' })
  create(
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; works?: Express.Multer.File[] },
    @Body() dto: AdminCreateArtistMultipartDto,
  ) {
    return this.artists.createWithMedia(dto, files);
  }

  @Get()
  @ApiOperation({ summary: 'List artists with filtering and pagination', description: 'Returns a paginated list of artists. Supports filtering by status and searching by name or handle.' })
  @ApiResponse({ status: 200, description: 'Paged list of artists' })
  list(@Query() query: ListArtistsDto) {
    return this.artists.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get artist by ID', description: 'Returns full artist details including bio, status, cover image, and portfolio works.' })
  @ApiParam({ name: 'id', description: 'Artist ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Artist found' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  findOne(@Param('id') id: string) {
    return this.artists.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update artist (multipart: optional cover + optional new works)',
    description: 'Updates artist profile fields and optionally replaces the cover image or adds new portfolio works. Accepts multipart/form-data.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover', maxCount: 1 },
        { name: 'works', maxCount: 50 },
      ],
      {
        storage: memoryStorage(), // IMPORTANT
        limits: {
          fileSize: 15 * 1024 * 1024,
        },
      },
    ),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        displayName: { type: 'string' },
        handle: { type: 'string' },
        slug: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
        bio: { type: 'string' },
        avatarUrl: { type: 'string' },

        worksMeta: {
          type: 'string',
          description:
            'JSON string array aligned with uploaded works. Example: [{"title":"Rose","tags":["blackwork"]}]',
          example: '[{"title":"Rose","tags":["blackwork"]}]',
        },

        cover: { type: 'string', format: 'binary' },
        works: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Artist updated' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  update(
    @Param('id') id: string,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; works?: Express.Multer.File[] },
    @Body() dto: AdminUpdateArtistMultipartDto,
  ) {
    return this.artists.updateWithMedia(id, dto, files);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate artist (soft delete)', description: 'Sets the artist status to INACTIVE. The artist is hidden from public listings but data is retained.' })
  @ApiParam({ name: 'id', description: 'Artist ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Artist deactivated' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  deactivate(@Param('id') id: string) {
    return this.artists.deactivate(id);
  }
}