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
exports.CreateGuestBookingDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateGuestBookingDto {
    name;
    phone;
    email;
    startDate;
    endDate;
    numberOfTables;
    acknowledgment;
}
exports.CreateGuestBookingDto = CreateGuestBookingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Alex Müller', description: 'Full name of the guest artist' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], CreateGuestBookingDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+49123456789', description: 'Contact phone number' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], CreateGuestBookingDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'alex@studio.de', description: 'Contact email address' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateGuestBookingDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-06-01', description: 'Start date (inclusive) — ISO date YYYY-MM-DD' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateGuestBookingDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-06-07', description: 'End date (inclusive) — ISO date YYYY-MM-DD' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateGuestBookingDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Number of tables to reserve per day (min 1)' }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateGuestBookingDto.prototype, "numberOfTables", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Must be true — artist acknowledges terms, document requirements, and non-refundable policy' }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateGuestBookingDto.prototype, "acknowledgment", void 0);
//# sourceMappingURL=create-guest-booking.dto.js.map