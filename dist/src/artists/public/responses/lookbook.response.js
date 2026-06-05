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
exports.LookbookResponse = void 0;
const swagger_1 = require("@nestjs/swagger");
const lookbook_artist_card_response_1 = require("./lookbook-artist-card.response");
class LookbookResponse {
    page;
    limit;
    total;
    items;
}
exports.LookbookResponse = LookbookResponse;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], LookbookResponse.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], LookbookResponse.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], LookbookResponse.prototype, "total", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [lookbook_artist_card_response_1.LookbookArtistCardResponse] }),
    __metadata("design:type", Array)
], LookbookResponse.prototype, "items", void 0);
//# sourceMappingURL=lookbook.response.js.map