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
exports.AdminCreateArtistMultipartDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const create_artist_dto_1 = require("./create-artist.dto");
class AdminCreateArtistMultipartDto extends create_artist_dto_1.CreateArtistDto {
    worksMeta;
}
exports.AdminCreateArtistMultipartDto = AdminCreateArtistMultipartDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'JSON string array aligned with uploaded "works" files. Example: [{"title":"Rose","tags":["blackwork"]}]',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminCreateArtistMultipartDto.prototype, "worksMeta", void 0);
//# sourceMappingURL=admin-create-artist.multipart.dto.js.map