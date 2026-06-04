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
exports.ArtistPageResponse = void 0;
const swagger_1 = require("@nestjs/swagger");
const work_card_response_1 = require("./work-card.response");
class ArtistPublicResponse {
    id;
    slug;
    handle;
    displayName;
    avatarUrl;
    coverUrl;
    bio;
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ArtistPublicResponse.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], ArtistPublicResponse.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], ArtistPublicResponse.prototype, "handle", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], ArtistPublicResponse.prototype, "displayName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], ArtistPublicResponse.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], ArtistPublicResponse.prototype, "coverUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], ArtistPublicResponse.prototype, "bio", void 0);
class WorksPagedResponse {
    page;
    limit;
    total;
    hasMore;
    items;
}
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorksPagedResponse.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorksPagedResponse.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], WorksPagedResponse.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], WorksPagedResponse.prototype, "hasMore", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [work_card_response_1.WorkCardResponse] }),
    __metadata("design:type", Array)
], WorksPagedResponse.prototype, "items", void 0);
class ArtistPageResponse {
    artist;
    works;
}
exports.ArtistPageResponse = ArtistPageResponse;
__decorate([
    (0, swagger_1.ApiProperty)({ type: ArtistPublicResponse }),
    __metadata("design:type", ArtistPublicResponse)
], ArtistPageResponse.prototype, "artist", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: WorksPagedResponse }),
    __metadata("design:type", WorksPagedResponse)
], ArtistPageResponse.prototype, "works", void 0);
//# sourceMappingURL=artist-page.response.js.map