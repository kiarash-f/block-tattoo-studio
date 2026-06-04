import { ApiPropertyOptional } from '@nestjs/swagger';
import { Allow, IsEmail, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { UpdateArtistDto } from './update-artist.dto';

export class AdminUpdateArtistMultipartDto extends UpdateArtistDto {
  // Override email so empty string from multipart forms is treated as absent
  @ApiPropertyOptional()
  @Transform(({ value }) =>
    !value || value.trim() === '' ? undefined : value.trim(),
  )
  @IsOptional()
  @IsEmail()
  override email?: string;

  @ApiPropertyOptional({
    description:
      'JSON string array aligned with uploaded "works" files. Example: [{"title":"Rose","tags":["blackwork"]}]',
  })
  @IsOptional()
  @IsString()
  worksMeta?: string;

  // Multer strips these into req.files, but empty file inputs can leak into
  // the body — whitelist them so forbidNonWhitelisted doesn't reject them.
  @IsOptional()
  @Allow()
  cover?: any;

  @IsOptional()
  @Allow()
  works?: any;
}
