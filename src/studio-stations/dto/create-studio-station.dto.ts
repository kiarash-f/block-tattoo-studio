import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class CreateStudioStationDto {
  @ApiProperty({ example: 'Station 1' })
  @IsString()
  @Length(2, 60)
  name!: string;

  @ApiPropertyOptional({ example: 'S1' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  code?: string;

  @ApiPropertyOptional({ enum: StationStatus, default: StationStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StationStatus)
  status?: StationStatus;
}
