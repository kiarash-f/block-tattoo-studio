import { ConfigService } from '@nestjs/config';
import { ChatRequestDto } from './dto/chat.dto';
export declare class ChatService {
    private readonly config;
    private readonly logger;
    private readonly anthropic;
    constructor(config: ConfigService);
    chat(dto: ChatRequestDto): Promise<{
        reply: string;
    }>;
}
