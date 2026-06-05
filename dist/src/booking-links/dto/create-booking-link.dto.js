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
exports.CreateBookingLinkDto = exports.BookingLinkScope = void 0;
const class_validator_1 = require("class-validator");
var BookingLinkScope;
(function (BookingLinkScope) {
    BookingLinkScope["INTAKE_CONTINUE"] = "INTAKE_CONTINUE";
    BookingLinkScope["UPLOAD"] = "UPLOAD";
    BookingLinkScope["VIEW"] = "VIEW";
})(BookingLinkScope || (exports.BookingLinkScope = BookingLinkScope = {}));
class CreateBookingLinkDto {
    scopes;
    expiresAt;
    revokeReason;
}
exports.CreateBookingLinkDto = CreateBookingLinkDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayNotEmpty)(),
    (0, class_validator_1.IsEnum)(BookingLinkScope, { each: true }),
    __metadata("design:type", Array)
], CreateBookingLinkDto.prototype, "scopes", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateBookingLinkDto.prototype, "expiresAt", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingLinkDto.prototype, "revokeReason", void 0);
//# sourceMappingURL=create-booking-link.dto.js.map