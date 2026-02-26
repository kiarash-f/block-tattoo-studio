import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateArtistDto } from './create-artist.dto';

export class AdminCreateArtistMultipartDto extends CreateArtistDto {
  @ApiPropertyOptional({
    description:
      'JSON string array aligned with uploaded "works" files. Example: [{"title":"Rose","tags":["blackwork"]}]',
  })
  @IsOptional()
  @IsString()
  worksMeta?: string;
}
