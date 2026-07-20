import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat.dto';

@ApiTags('Public / Chat')
@Controller('public/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Send a message to the studio AI assistant',
    description:
      'Sends a user message to the AI chat assistant and returns a reply. Optionally include conversation history for multi-turn context. Rate limited to 20 requests per minute per IP.',
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiResponse({
    status: 200,
    description: 'AI reply',
    schema: { example: { reply: 'string' } },
  })
  chat(@Body() dto: ChatRequestDto) {
    return this.chatService.chat(dto);
  }
}
