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
  @ApiOperation({ summary: 'Create new studio station' })
  @ApiResponse({ status: 201, description: 'Station created' })
  create(@Body() dto: CreateStudioStationDto) {
    return this.stations.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List studio stations with filtering and pagination',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'] })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  list(@Query() query: ListStudioStationsDto) {
    return this.stations.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get station by ID' })
  @ApiParam({ name: 'id', description: 'Station ID (cuid)' })
  findOne(@Param('id') id: string) {
    return this.stations.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update station' })
  @ApiParam({ name: 'id', description: 'Station ID (cuid)' })
  update(@Param('id') id: string, @Body() dto: UpdateStudioStationDto) {
    return this.stations.update(id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate station (soft delete)' })
  @ApiParam({ name: 'id', description: 'Station ID (cuid)' })
  deactivate(@Param('id') id: string) {
    return this.stations.deactivate(id);
  }
}
