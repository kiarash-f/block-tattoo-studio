import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LookbookQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // search displayName/handle/slug

  @IsOptional()
  @IsString()
  tag?: string; // hashtag filter (ArtistWork.tags has tag)

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
