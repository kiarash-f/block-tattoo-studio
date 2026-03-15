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
import { StudioStationsService } from './studio-stations.service';
import { CreateStudioStationDto } from './dto/create-studio-station.dto';
import { UpdateStudioStationDto } from './dto/update-studio-station.dto';
import { ListStudioStationsDto } from './dto/list-studio-stations.dto';
import { AuthGuard } from '@nestjs/passport';


@ApiTags('Admin / Stations')
@ApiBearerAuth('admin-jwt')
@Controller('studio-stations')
@UseGuards(AuthGuard('jwt'))
export class StudioStationsController {
  constructor(private readonly stations: StudioStationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new studio station', description: 'Creates a new bookable studio station (e.g. tattoo chair, consultation room).' })
  @ApiResponse({ status: 201, description: 'Station created' })
  create(@Body() dto: CreateStudioStationDto) {
    return this.stations.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List studio stations with filtering and pagination',
    description: 'Returns a paginated list of studio stations. Supports filtering by status (ACTIVE/INACTIVE) and a text search query.',
  })
  @ApiResponse({ status: 200, description: 'Paged list of stations.' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  list(@Query() query: ListStudioStationsDto) {
    return this.stations.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get station by ID', description: 'Returns details for a single studio station.' })
  @ApiParam({ name: 'id', description: 'Station ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Station found.' })
  @ApiResponse({ status: 404, description: 'Station not found.' })
  findOne(@Param('id') id: string) {
    return this.stations.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update station', description: 'Updates name, description, or status of a studio station.' })
  @ApiParam({ name: 'id', description: 'Station ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Station updated.' })
  @ApiResponse({ status: 404, description: 'Station not found.' })
  update(@Param('id') id: string, @Body() dto: UpdateStudioStationDto) {
    return this.stations.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate station (soft delete)', description: 'Sets the station status to INACTIVE. The station is excluded from scheduling but data is retained.' })
  @ApiParam({ name: 'id', description: 'Station ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Station deactivated.' })
  @ApiResponse({ status: 404, description: 'Station not found.' })
  deactivate(@Param('id') id: string) {
    return this.stations.deactivate(id);
  }
}
