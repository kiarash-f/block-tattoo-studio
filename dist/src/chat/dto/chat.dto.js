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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRequestDto = exports.ChatMessageDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class ChatMessageDto {
    role;
    content;
}
exports.ChatMessageDto = ChatMessageDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['user', 'assistant'] }),
    (0, class_validator_1.IsIn)(['user', 'assistant']),
    __metadata("design:type", String)
], ChatMessageDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ maxLength: 2000 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], ChatMessageDto.prototype, "content", void 0);
class ChatRequestDto {
    message;
    history;
}
exports.ChatRequestDto = ChatRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ maxLength: 1000 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], ChatRequestDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [ChatMessageDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_transformer_1.Type)(() => ChatMessageDto),
    __metadata("design:type", Array)
], ChatRequestDto.prototype, "history", void 0);
//# sourceMappingURL=chat.dto.js.map