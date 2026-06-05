export declare class ChatMessageDto {
    role: 'user' | 'assistant';
    content: string;
}
export declare class ChatRequestDto {
    message: string;
    history: ChatMessageDto[];
}
