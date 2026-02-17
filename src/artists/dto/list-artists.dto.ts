import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ArtistStatus } from '@prisma/client';

export class ListArtistsDto {
  @IsOptional()
  @IsEnum(ArtistStatus)
  status?: ArtistStatus;

  @IsOptional()
  @IsString()
  q?: string; // search query for displayName/handle/email

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
