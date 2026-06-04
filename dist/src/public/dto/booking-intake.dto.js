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
exports.CreateBookingIntakeDto = exports.BookingRequestDto = exports.ConsentDto = exports.MedicalDeclarationDto = exports.ClientDto = exports.PreferredTimeOfDay = exports.BookingType = exports.IntakeSource = exports.BudgetRange = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var BudgetRange;
(function (BudgetRange) {
    BudgetRange["UNDER_200"] = "UNDER_200";
    BudgetRange["_200_400"] = "_200_400";
    BudgetRange["_400_700"] = "_400_700";
    BudgetRange["_700_1000"] = "_700_1000";
    BudgetRange["_1000_1500"] = "_1000_1500";
    BudgetRange["_1500_2000"] = "_1500_2000";
    BudgetRange["OVER_2000"] = "OVER_2000";
})(BudgetRange || (exports.BudgetRange = BudgetRange = {}));
var IntakeSource;
(function (IntakeSource) {
    IntakeSource["DIRECT"] = "DIRECT";
    IntakeSource["INSTAGRAM"] = "INSTAGRAM";
    IntakeSource["FACEBOOK"] = "FACEBOOK";
    IntakeSource["GOOGLE"] = "GOOGLE";
    IntakeSource["TIKTOK"] = "TIKTOK";
    IntakeSource["OTHER"] = "OTHER";
})(IntakeSource || (exports.IntakeSource = IntakeSource = {}));
var BookingType;
(function (BookingType) {
    BookingType["APPOINTMENT"] = "APPOINTMENT";
    BookingType["CONSULTATION"] = "CONSULTATION";
    BookingType["COVER_UP"] = "COVER_UP";
    BookingType["WALK_IN"] = "WALK_IN";
})(BookingType || (exports.BookingType = BookingType = {}));
var PreferredTimeOfDay;
(function (PreferredTimeOfDay) {
    PreferredTimeOfDay["MORNING"] = "MORNING";
    PreferredTimeOfDay["AFTERNOON"] = "AFTERNOON";
    PreferredTimeOfDay["EVENING"] = "EVENING";
    PreferredTimeOfDay["ANY"] = "ANY";
})(PreferredTimeOfDay || (exports.PreferredTimeOfDay = PreferredTimeOfDay = {}));
class ClientDto {
    firstName;
    lastName;
    email;
    phone;
    instagram;
    birthday;
}
exports.ClientDto = ClientDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ClientDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(80),
    __metadata("design:type", String)
], ClientDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], ClientDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], ClientDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(60),
    __metadata("design:type", String)
], ClientDto.prototype, "instagram", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ClientDto.prototype, "birthday", void 0);
class MedicalDeclarationDto {
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
exports.MedicalDeclarationDto = MedicalDeclarationDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MedicalDeclarationDto.prototype, "hasAllergies", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], MedicalDeclarationDto.prototype, "allergiesDetails", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MedicalDeclarationDto.prototype, "hasSkinCondition", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], MedicalDeclarationDto.prototype, "skinConditionDetails", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MedicalDeclarationDto.prototype, "isPregnantOrNursing", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MedicalDeclarationDto.prototype, "hasHeartCondition", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MedicalDeclarationDto.prototype, "hasDiabetes", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MedicalDeclarationDto.prototype, "takesBloodThinners", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], MedicalDeclarationDto.prototype, "takesMedication", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], MedicalDeclarationDto.prototype, "medicationDetails", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], MedicalDeclarationDto.prototype, "otherNotes", void 0);
class ConsentDto {
    isAdultConfirmed;
    termsAccepted;
    privacyAccepted;
    fullName;
    signedAt;
}
exports.ConsentDto = ConsentDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConsentDto.prototype, "isAdultConfirmed", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConsentDto.prototype, "termsAccepted", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ConsentDto.prototype, "privacyAccepted", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], ConsentDto.prototype, "fullName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ConsentDto.prototype, "signedAt", void 0);
class BookingRequestDto {
    bookingType;
    consultDate;
    description;
    budgetRange;
    placement;
    sizeDescription;
    styleNotes;
    referencesNotes;
    preferredArtistName;
    studioChooses;
    source;
    utmCampaign;
    utmAdset;
    utmAd;
    referrer;
    landingPath;
    preferredDateFrom;
    preferredDateTo;
    preferredTimeOfDay;
    preferredDaysNote;
}
exports.BookingRequestDto = BookingRequestDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(BookingType),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "bookingType", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "consultDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(BudgetRange),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "budgetRange", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "placement", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "sizeDescription", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "styleNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "referencesNotes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "preferredArtistName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], BookingRequestDto.prototype, "studioChooses", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(IntakeSource),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "utmCampaign", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "utmAdset", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "utmAd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "referrer", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(300),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "landingPath", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "preferredDateFrom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "preferredDateTo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(PreferredTimeOfDay),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "preferredTimeOfDay", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], BookingRequestDto.prototype, "preferredDaysNote", void 0);
class CreateBookingIntakeDto {
    client;
    bookingRequest;
}
exports.CreateBookingIntakeDto = CreateBookingIntakeDto;
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ClientDto),
    __metadata("design:type", ClientDto)
], CreateBookingIntakeDto.prototype, "client", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => BookingRequestDto),
    __metadata("design:type", BookingRequestDto)
], CreateBookingIntakeDto.prototype, "bookingRequest", void 0);
//# sourceMappingURL=booking-intake.dto.js.map