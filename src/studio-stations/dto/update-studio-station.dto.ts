import { PartialType } from '@nestjs/mapped-types';
import { CreateStudioStationDto } from './create-studio-station.dto';

export class UpdateStudioStationDto extends PartialType(CreateStudioStationDto) {}
