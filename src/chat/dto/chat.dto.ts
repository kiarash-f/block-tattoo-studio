import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class ChatRequestDto {
  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;

  @ApiProperty({ type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(20)
  @Type(() => ChatMessageDto)
  history!: ChatMessageDto[];
}
