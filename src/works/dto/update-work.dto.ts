import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PublishStatus } from '@prisma/client';

export class UpdateWorkDto {
  @ApiPropertyOptional({ example: 'Rose sleeve' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @ApiPropertyOptional({ example: ['blackwork', 'fine-line'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: PublishStatus })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;
}
