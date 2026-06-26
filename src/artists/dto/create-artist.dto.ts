import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
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
  @Transform(({ value }) => (value === '' ? undefined : value))
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

  // ─── Featured guest artist promotion ────────────────────────────────────────
  // Multipart sends everything as strings, so booleans/dates are coerced here.

  @ApiPropertyOptional({
    description:
      'Flag this artist as a featured guest (drives the guest badge on the public profile).',
    example: true,
  })
  @Transform(({ value }) =>
    value === undefined || value === null || value === ''
      ? undefined
      : value === true || value === 'true',
  )
  @IsOptional()
  @IsBoolean()
  isFeaturedGuest?: boolean;

  @ApiPropertyOptional({
    description: 'Guest availability start (display only). ISO date YYYY-MM-DD.',
    example: '2026-07-05',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({
    description: 'Guest availability end (display only). ISO date YYYY-MM-DD.',
    example: '2026-07-08',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  availableTo?: string;

  @ApiPropertyOptional({
    description: 'Public Instagram handle for a featured guest.',
    example: 'alex.ink',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Length(1, 100)
  instagram?: string;
}
