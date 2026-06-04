import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Allow,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PublishStatus } from '@prisma/client';

export class CreateArticleDto {
  @ApiProperty({ example: 'How to Care for Your New Tattoo' })
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug. Auto-generated from title if omitted.',
    example: 'how-to-care-for-your-new-tattoo',
  })
  @IsOptional()
  @IsString()
  @Length(1, 220)
  slug?: string;

  @ApiPropertyOptional({ example: 'A short summary of the article.' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  excerpt?: string;

  @ApiProperty({ example: '<p>Full article HTML or Markdown content.</p>' })
  @IsString()
  @Length(1, 100000)
  content!: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  @Transform(({ value }) =>
    !value || value.trim() === '' ? undefined : value.trim(),
  )
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional({ type: [String], example: ['aftercare', 'tips'] })
  @Transform(({ value }) => {
    if (!value || value === '') return undefined;
    if (Array.isArray(value)) return value;
    try {
      return JSON.parse(value);
    } catch {
      return [value];
    }
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: PublishStatus, default: PublishStatus.DRAFT })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  // Multer strips this into req.file, but empty file inputs can leak into
  // the body — whitelist it so forbidNonWhitelisted doesn't reject it.
  @IsOptional()
  @Allow()
  cover?: any;
}
