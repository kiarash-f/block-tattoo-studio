"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const chat_service_1 = require("./chat.service");
const chat_dto_1 = require("./dto/chat.dto");
let ChatController = class ChatController {
    chatService;
    constructor(chatService) {
        this.chatService = chatService;
    }
    chat(dto) {
        return this.chatService.chat(dto);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(200),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message to the studio AI assistant', description: 'Sends a user message to the AI chat assistant and returns a reply. Optionally include conversation history for multi-turn context. Rate limited to 20 requests per minute per IP.' }),
    (0, swagger_1.ApiBody)({ type: chat_dto_1.ChatRequestDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'AI reply',
        schema: { example: { reply: 'string' } },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [chat_dto_1.ChatRequestDto]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "chat", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('Public / Chat'),
    (0, common_1.Controller)('public/chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map