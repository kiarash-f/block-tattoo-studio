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
exports.PublicArtistsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_artists_service_1 = require("./public-artists.service");
const lookbook_query_dto_1 = require("./dto/lookbook.query.dto");
const artist_page_query_dto_1 = require("./dto/artist-page.query.dto");
let PublicArtistsController = class PublicArtistsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    lookbook(query) {
        return this.svc.lookbook(query);
    }
    artistPage(slug, query) {
        return this.svc.artistPageBySlug(slug, query);
    }
};
exports.PublicArtistsController = PublicArtistsController;
__decorate([
    (0, common_1.Get)('lookbook'),
    (0, swagger_1.ApiOperation)({
        summary: 'Lookbook: list artists that have published works (optional tag filter + preview latestWorks)',
        description: 'Returns active artists who have at least one published work, including a preview of their latest works. Supports optional tag filtering and pagination.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'tag', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Lookbook artists' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [lookbook_query_dto_1.LookbookQueryDto]),
    __metadata("design:returntype", void 0)
], PublicArtistsController.prototype, "lookbook", null);
__decorate([
    (0, common_1.Get)(':slug'),
    (0, swagger_1.ApiOperation)({
        summary: 'Artist page: get artist profile + paginated published works in ONE request',
        description: 'Returns full artist profile details along with a paginated list of their published portfolio works. Used to render the public artist page.',
    }),
    (0, swagger_1.ApiParam)({ name: 'slug', example: 'alex-ink' }),
    (0, swagger_1.ApiQuery)({ name: 'tag', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'worksPage', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'worksLimit', required: false, example: 12 }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Artist page payload' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Artist not found' }),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, artist_page_query_dto_1.ArtistPageQueryDto]),
    __metadata("design:returntype", void 0)
], PublicArtistsController.prototype, "artistPage", null);
exports.PublicArtistsController = PublicArtistsController = __decorate([
    (0, swagger_1.ApiTags)('Public / Artists'),
    (0, common_1.Controller)('public/artists'),
    __metadata("design:paramtypes", [public_artists_service_1.PublicArtistsService])
], PublicArtistsController);
//# sourceMappingURL=public-artists.controller.js.map