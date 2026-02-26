import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, Length } from 'class-validator';

export class WorkMetaDto {
  @ApiPropertyOptional({ example: 'Rose' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @ApiPropertyOptional({ example: ['blackwork', 'fine-line'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
