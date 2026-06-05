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
exports.ArtistsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const artists_service_1 = require("./artists.service");
const list_artists_dto_1 = require("./dto/list-artists.dto");
const admin_create_artist_multipart_dto_1 = require("./dto/admin-create-artist.multipart.dto");
const admin_update_artist_multipart_dto_1 = require("./dto/admin-update-artist.multipart.dto");
let ArtistsController = class ArtistsController {
    artists;
    constructor(artists) {
        this.artists = artists;
    }
    create(files, dto) {
        return this.artists.createWithMedia(dto, files);
    }
    list(query) {
        return this.artists.list(query);
    }
    findOne(id) {
        return this.artists.findOne(id);
    }
    update(id, files, dto) {
        return this.artists.updateWithMedia(id, dto, files);
    }
    deactivate(id) {
        return this.artists.deactivate(id);
    }
};
exports.ArtistsController = ArtistsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create new artist (multipart: cover + works)',
        description: 'Creates a new artist profile with optional cover image and portfolio work uploads. Accepts multipart/form-data.',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'cover', maxCount: 1 },
        { name: 'works', maxCount: 50 },
    ], {
        storage: (0, multer_1.memoryStorage)(),
        limits: {
            fileSize: 15 * 1024 * 1024,
        },
    })),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                displayName: { type: 'string', example: 'Alex Ink' },
                handle: { type: 'string', example: 'alex-ink' },
                slug: { type: 'string', example: 'alex-ink' },
                email: { type: 'string', example: 'alex@example.com' },
                phone: { type: 'string', example: '+4912345678' },
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
                bio: { type: 'string' },
                avatarUrl: { type: 'string' },
                worksMeta: {
                    type: 'string',
                    description: 'JSON string array aligned with uploaded works. Example: [{"title":"Rose","tags":["blackwork"]}]',
                    example: '[{"title":"Rose","tags":["blackwork"]}]',
                },
                cover: { type: 'string', format: 'binary' },
                works: { type: 'array', items: { type: 'string', format: 'binary' } },
            },
            required: ['displayName'],
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Artist created' }),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, admin_create_artist_multipart_dto_1.AdminCreateArtistMultipartDto]),
    __metadata("design:returntype", void 0)
], ArtistsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List artists with filtering and pagination',
        description: 'Returns a paginated list of artists. Supports filtering by status and searching by name or handle.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paged list of artists' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_artists_dto_1.ListArtistsDto]),
    __metadata("design:returntype", void 0)
], ArtistsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get artist by ID',
        description: 'Returns full artist details including bio, status, cover image, and portfolio works.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Artist ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Artist found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Artist not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArtistsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update artist (multipart: optional cover + optional new works)',
        description: 'Updates artist profile fields and optionally replaces the cover image or adds new portfolio works. Accepts multipart/form-data.',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'cover', maxCount: 1 },
        { name: 'works', maxCount: 50 },
    ], {
        storage: (0, multer_1.memoryStorage)(),
        limits: {
            fileSize: 15 * 1024 * 1024,
        },
    })),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                displayName: { type: 'string' },
                handle: { type: 'string' },
                slug: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
                bio: { type: 'string' },
                avatarUrl: { type: 'string' },
                worksMeta: {
                    type: 'string',
                    description: 'JSON string array aligned with uploaded works. Example: [{"title":"Rose","tags":["blackwork"]}]',
                    example: '[{"title":"Rose","tags":["blackwork"]}]',
                },
                cover: { type: 'string', format: 'binary' },
                works: { type: 'array', items: { type: 'string', format: 'binary' } },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Artist updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Artist not found' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, admin_update_artist_multipart_dto_1.AdminUpdateArtistMultipartDto]),
    __metadata("design:returntype", void 0)
], ArtistsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, swagger_1.ApiOperation)({
        summary: 'Deactivate artist (soft delete)',
        description: 'Sets the artist status to INACTIVE. The artist is hidden from public listings but data is retained.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Artist ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Artist deactivated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Artist not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArtistsController.prototype, "deactivate", null);
exports.ArtistsController = ArtistsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Artists'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('artists'),
    __metadata("design:paramtypes", [artists_service_1.ArtistsService])
], ArtistsController);
//# sourceMappingURL=artists.controller.js.map