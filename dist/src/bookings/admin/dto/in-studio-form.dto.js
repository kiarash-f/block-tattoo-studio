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
exports.SubmitInStudioFormDto = exports.InStudioConsentDto = exports.InStudioMedicalDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const class_validator_2 = require("class-validator");
class InStudioMedicalDto {
    hasAllergies;
    allergiesDetails;
    hasSkinCondition;
    skinConditionDetails;
    isPregnantOrNursing;
    hasHeartCondition;
    hasDiabetes;
    takesBloodThinners;
    takesMedication;
    medicationDetails;
    otherNotes;
}
exports.InStudioMedicalDto = InStudioMedicalDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioMedicalDto.prototype, "hasAllergies", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InStudioMedicalDto.prototype, "allergiesDetails", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioMedicalDto.prototype, "hasSkinCondition", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InStudioMedicalDto.prototype, "skinConditionDetails", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioMedicalDto.prototype, "isPregnantOrNursing", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioMedicalDto.prototype, "hasHeartCondition", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioMedicalDto.prototype, "hasDiabetes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioMedicalDto.prototype, "takesBloodThinners", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioMedicalDto.prototype, "takesMedication", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InStudioMedicalDto.prototype, "medicationDetails", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InStudioMedicalDto.prototype, "otherNotes", void 0);
class InStudioConsentDto {
    isAdultConfirmed;
    termsAccepted;
    privacyAccepted;
    fullName;
    signedAt;
}
exports.InStudioConsentDto = InStudioConsentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioConsentDto.prototype, "isAdultConfirmed", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioConsentDto.prototype, "termsAccepted", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], InStudioConsentDto.prototype, "privacyAccepted", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional signature name' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InStudioConsentDto.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Optional signature timestamp (ISO)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], InStudioConsentDto.prototype, "signedAt", void 0);
class SubmitInStudioFormDto {
    medical;
    consent;
}
exports.SubmitInStudioFormDto = SubmitInStudioFormDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: () => InStudioMedicalDto }),
    (0, class_validator_1.IsDefined)(),
    (0, class_validator_2.ValidateNested)(),
    (0, class_transformer_1.Type)(() => InStudioMedicalDto),
    __metadata("design:type", InStudioMedicalDto)
], SubmitInStudioFormDto.prototype, "medical", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: () => InStudioConsentDto }),
    (0, class_validator_1.IsDefined)(),
    (0, class_validator_2.ValidateNested)(),
    (0, class_transformer_1.Type)(() => InStudioConsentDto),
    __metadata("design:type", InStudioConsentDto)
], SubmitInStudioFormDto.prototype, "consent", void 0);
//# sourceMappingURL=in-studio-form.dto.js.map