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
exports.CreateArticleDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class CreateArticleDto {
    title;
    slug;
    excerpt;
    content;
    coverUrl;
    tags;
    status;
    cover;
}
exports.CreateArticleDto = CreateArticleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'How to Care for Your New Tattoo' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 200),
    __metadata("design:type", String)
], CreateArticleDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'URL-friendly slug. Auto-generated from title if omitted.',
        example: 'how-to-care-for-your-new-tattoo',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 220),
    __metadata("design:type", String)
], CreateArticleDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'A short summary of the article.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 500),
    __metadata("design:type", String)
], CreateArticleDto.prototype, "excerpt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '<p>Full article HTML or Markdown content.</p>' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100000),
    __metadata("design:type", String)
], CreateArticleDto.prototype, "content", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://res.cloudinary.com/...' }),
    (0, class_transformer_1.Transform)(({ value }) => (!value || value.trim() === '' ? undefined : value.trim())),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CreateArticleDto.prototype, "coverUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String], example: ['aftercare', 'tips'] }),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (!value || value === '')
            return undefined;
        if (Array.isArray(value))
            return value;
        try {
            return JSON.parse(value);
        }
        catch {
            return [value];
        }
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateArticleDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.PublishStatus, default: client_1.PublishStatus.DRAFT }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.PublishStatus),
    __metadata("design:type", String)
], CreateArticleDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Allow)(),
    __metadata("design:type", Object)
], CreateArticleDto.prototype, "cover", void 0);
//# sourceMappingURL=create-article.dto.js.map