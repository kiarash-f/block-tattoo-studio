import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StationConfigService } from './station-config.service';
import { UpdateStationConfigDto } from './dto/update-station-config.dto';

@ApiTags('Admin / Station Config')
@ApiBearerAuth('admin-jwt')
@UseGuards(AuthGuard('jwt'))
@Controller('admin/station-config')
export class StationConfigController {
  constructor(private readonly service: StationConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Get station config',
    description:
      'Returns the current guest artist station configuration (total tables, price per day, monthly discount).',
  })
  @ApiResponse({ status: 200, description: 'Current config.' })
  @ApiResponse({ status: 404, description: 'Config not set up yet.' })
  get() {
    return this.service.get();
  }

  @Patch()
  @ApiOperation({
    summary: 'Update station config',
    description:
      'Updates (or creates on first use) the station config. All fields are optional — only send what you want to change.',
  })
  @ApiBody({ type: UpdateStationConfigDto })
  @ApiResponse({ status: 200, description: 'Config updated.' })
  upsert(@Body() dto: UpdateStationConfigDto) {
    return this.service.upsert(dto);
  }
}
