import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UploadKind } from '@prisma/client';

export class PublicUploadDto {
  @ApiPropertyOptional({
    enum: UploadKind,
    description: 'Kind of upload (optional, default REFERENCE)',
  })
  @IsOptional()
  @IsEnum(UploadKind)
  kind?: UploadKind;

  @ApiPropertyOptional({ description: 'Optional note for this upload batch' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
