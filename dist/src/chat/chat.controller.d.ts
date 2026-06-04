import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    chat(dto: ChatRequestDto): Promise<{
        reply: string;
    }>;
}
