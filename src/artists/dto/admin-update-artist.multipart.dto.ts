import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { UpdateArtistDto } from './update-artist.dto';

export class AdminUpdateArtistMultipartDto extends UpdateArtistDto {
  @ApiPropertyOptional({
    description:
      'JSON string array aligned with uploaded "works" files. Example: [{"title":"Rose","tags":["blackwork"]}]',
  })
  @IsOptional()
  @IsString()
  worksMeta?: string;
}
