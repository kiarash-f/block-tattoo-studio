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
exports.CreateTattooSessionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateTattooSessionDto {
    scheduledDate;
    artistId;
    durationNote;
    notes;
}
exports.CreateTattooSessionDto = CreateTattooSessionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Scheduled date/time for the session (ISO 8601)',
        example: '2026-04-15T10:00:00.000Z',
    }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTattooSessionDto.prototype, "scheduledDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Artist id to assign to the session' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTattooSessionDto.prototype, "artistId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: 'Full day',
        description: 'Free-text duration note',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTattooSessionDto.prototype, "durationNote", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Internal session notes' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTattooSessionDto.prototype, "notes", void 0);
//# sourceMappingURL=create-tattoo-session.dto.js.map