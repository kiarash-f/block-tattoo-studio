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
exports.PublicIntakeResponseDto = exports.PublicUploadDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class PublicUploadDto {
    id;
    kind;
    url;
    createdAt;
}
exports.PublicUploadDto = PublicUploadDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicUploadDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicUploadDto.prototype, "kind", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicUploadDto.prototype, "url", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicUploadDto.prototype, "createdAt", void 0);
class PublicIntakeResponseDto {
    id;
    status;
    placement;
    sizeDescription;
    styleNotes;
    description;
    budgetRange;
    referencesNotes;
    preferredArtistName;
    studioChooses;
    uploads;
    medicalDeclaration;
    consent;
}
exports.PublicIntakeResponseDto = PublicIntakeResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicIntakeResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicIntakeResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], PublicIntakeResponseDto.prototype, "placement", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], PublicIntakeResponseDto.prototype, "sizeDescription", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], PublicIntakeResponseDto.prototype, "styleNotes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicIntakeResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], PublicIntakeResponseDto.prototype, "budgetRange", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], PublicIntakeResponseDto.prototype, "referencesNotes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], PublicIntakeResponseDto.prototype, "preferredArtistName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Boolean)
], PublicIntakeResponseDto.prototype, "studioChooses", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [PublicUploadDto] }),
    __metadata("design:type", Array)
], PublicIntakeResponseDto.prototype, "uploads", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], PublicIntakeResponseDto.prototype, "medicalDeclaration", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ nullable: true }),
    __metadata("design:type", Object)
], PublicIntakeResponseDto.prototype, "consent", void 0);
//# sourceMappingURL=public-intake.response.dto.js.map