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
exports.AdminArticlesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const articles_service_1 = require("./articles.service");
const create_article_dto_1 = require("./dto/create-article.dto");
const update_article_dto_1 = require("./dto/update-article.dto");
const list_articles_dto_1 = require("./dto/list-articles.dto");
let AdminArticlesController = class AdminArticlesController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(dto, req, cover) {
        return this.service.create(dto, req.user.sub, cover);
    }
    findAll(query) {
        return this.service.findAll(query);
    }
    findOne(id) {
        return this.service.findOne(id);
    }
    update(id, dto, cover) {
        return this.service.update(id, dto, cover);
    }
    publish(id) {
        return this.service.publish(id);
    }
    unpublish(id) {
        return this.service.unpublish(id);
    }
    remove(id) {
        return this.service.remove(id);
    }
};
exports.AdminArticlesController = AdminArticlesController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new article (draft by default)', description: 'Creates a new blog/news article in DRAFT status. The article is not publicly visible until published.' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string', example: 'How to Care for Your New Tattoo' },
                slug: { type: 'string' },
                excerpt: { type: 'string' },
                content: { type: 'string' },
                coverUrl: { type: 'string', description: 'URL fallback if no file is uploaded' },
                tags: { type: 'array', items: { type: 'string' } },
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
                cover: { type: 'string', format: 'binary', description: 'Cover image file' },
            },
            required: ['title', 'content'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Article created.' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('cover', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 15 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_article_dto_1.CreateArticleDto, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminArticlesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List articles (admin — all statuses)', description: 'Returns a paginated list of all articles including drafts and unpublished items. Supports filtering by status and text search.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paged list of articles.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_articles_dto_1.ListArticlesDto]),
    __metadata("design:returntype", void 0)
], AdminArticlesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get article by id (admin)', description: 'Returns a single article by ID regardless of publish status.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Article ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Article found.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Article not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminArticlesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update article', description: 'Updates article content, title, slug, or metadata fields. Optionally replaces the cover image.' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                slug: { type: 'string' },
                excerpt: { type: 'string' },
                content: { type: 'string' },
                coverUrl: { type: 'string', description: 'URL fallback if no file is uploaded' },
                tags: { type: 'array', items: { type: 'string' } },
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
                cover: { type: 'string', format: 'binary', description: 'Replaces the current cover image' },
            },
        },
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Article ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Article updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Article not found.' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('cover', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 15 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_article_dto_1.UpdateArticleDto, Object]),
    __metadata("design:returntype", void 0)
], AdminArticlesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    (0, swagger_1.ApiOperation)({ summary: 'Publish an article', description: 'Sets the article status to PUBLISHED and sets publishedAt to the current timestamp, making it publicly visible.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Article ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Article published.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Article not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminArticlesController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/unpublish'),
    (0, swagger_1.ApiOperation)({ summary: 'Revert article back to draft', description: 'Sets the article status back to DRAFT, removing it from public listings.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Article ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Article reverted to draft.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Article not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminArticlesController.prototype, "unpublish", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete article', description: 'Permanently deletes an article.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Article ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Article deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Article not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminArticlesController.prototype, "remove", null);
exports.AdminArticlesController = AdminArticlesController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Articles'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.Controller)('admin/articles'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [articles_service_1.ArticlesService])
], AdminArticlesController);
//# sourceMappingURL=admin-articles.controller.js.map