import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentRole } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateBookingAssignmentDto {
  @ApiProperty({ description: 'Artist ID (cuid)' })
  @IsString()
  artistId!: string;

  @ApiPropertyOptional({ description: 'Station ID (cuid)' })
  @IsOptional()
  @IsString()
  stationId?: string;

  @ApiPropertyOptional({
    enum: AssignmentRole,
    default: AssignmentRole.PRIMARY,
  })
  @IsOptional()
  @IsEnum(AssignmentRole)
  role?: AssignmentRole;

  // Future scheduling placeholders (store only; minimal validation in service)
  @ApiPropertyOptional({
    description: 'Segment start time (ISO)',
    example: '2026-02-17T10:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Segment end time (ISO)',
    example: '2026-02-17T12:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  note?: string;
}
