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
exports.PublicArticlesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const articles_service_1 = require("./articles.service");
const list_articles_dto_1 = require("./dto/list-articles.dto");
let PublicArticlesController = class PublicArticlesController {
    service;
    constructor(service) {
        this.service = service;
    }
    findAll(query) {
        return this.service.findPublished(query);
    }
    findBySlug(slug) {
        return this.service.findBySlug(slug);
    }
};
exports.PublicArticlesController = PublicArticlesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List published articles', description: 'Returns a paginated list of publicly visible (PUBLISHED) articles for the blog/news feed.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paged list of published articles.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_articles_dto_1.ListArticlesDto]),
    __metadata("design:returntype", void 0)
], PublicArticlesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get published article by slug', description: 'Returns a single published article by its URL slug. Returns 404 if the article is not found or not published.' }),
    (0, swagger_1.ApiParam)({ name: 'slug', description: 'Article URL slug' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Article found.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Article not found or not published.' }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicArticlesController.prototype, "findBySlug", null);
exports.PublicArticlesController = PublicArticlesController = __decorate([
    (0, swagger_1.ApiTags)('Public / Articles'),
    (0, common_1.Controller)('public/articles'),
    __metadata("design:paramtypes", [articles_service_1.ArticlesService])
], PublicArticlesController);
//# sourceMappingURL=public-articles.controller.js.map