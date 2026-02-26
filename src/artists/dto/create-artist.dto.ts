import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ArtistStatus } from '@prisma/client';

export class CreateArtistDto {
  @ApiProperty({ example: 'Alex Ink' })
  @IsString()
  @Length(2, 80)
  displayName!: string;

  @ApiPropertyOptional({ example: 'alex-ink' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
  handle?: string;

  @ApiPropertyOptional({ example: 'alex@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+4912345678' })
  @IsOptional()
  @IsString()
  @Length(5, 40)
  phone?: string;

  @ApiPropertyOptional({ enum: ArtistStatus, default: ArtistStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ArtistStatus)
  status?: ArtistStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'alex-ink' })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
  slug?: string;
}
