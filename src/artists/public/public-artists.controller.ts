import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PublicArtistsService } from './public-artists.service';
import { LookbookQueryDto } from './dto/lookbook.query.dto';
import { ArtistPageQueryDto } from './dto/artist-page.query.dto';

@ApiTags('Public / Artists')
@Controller('public/artists')
export class PublicArtistsController {
  constructor(private readonly svc: PublicArtistsService) {}

  @Get('lookbook')
  @ApiOperation({
    summary:
      'Lookbook: list artists that have published works (optional tag filter + preview latestWorks)',
    description:
      'Returns active artists who have at least one published work, including a preview of their latest works. Supports optional tag filtering and pagination.',
  })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Lookbook artists' })
  lookbook(@Query() query: LookbookQueryDto) {
    return this.svc.lookbook(query);
  }

  @Get(':slug')
  @ApiOperation({
    summary:
      'Artist page: get artist profile + paginated published works in ONE request',
    description:
      'Returns full artist profile details along with a paginated list of their published portfolio works. Used to render the public artist page.',
  })
  @ApiParam({ name: 'slug', example: 'alex-ink' })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'worksPage', required: false, example: 1 })
  @ApiQuery({ name: 'worksLimit', required: false, example: 12 })
  @ApiResponse({ status: 200, description: 'Artist page payload' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  artistPage(@Param('slug') slug: string, @Query() query: ArtistPageQueryDto) {
    return this.svc.artistPageBySlug(slug, query);
  }
}
