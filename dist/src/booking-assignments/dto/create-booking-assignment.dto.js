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
exports.CreateBookingAssignmentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class CreateBookingAssignmentDto {
    artistId;
    stationId;
    role;
    startsAt;
    endsAt;
    note;
}
exports.CreateBookingAssignmentDto = CreateBookingAssignmentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Artist ID (cuid)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingAssignmentDto.prototype, "artistId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Station ID (cuid)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBookingAssignmentDto.prototype, "stationId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: client_1.AssignmentRole,
        default: client_1.AssignmentRole.PRIMARY,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.AssignmentRole),
    __metadata("design:type", String)
], CreateBookingAssignmentDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Segment start time (ISO)',
        example: '2026-02-17T10:00:00.000Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], CreateBookingAssignmentDto.prototype, "startsAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Segment end time (ISO)',
        example: '2026-02-17T12:00:00.000Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsISO8601)(),
    __metadata("design:type", String)
], CreateBookingAssignmentDto.prototype, "endsAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 2000),
    __metadata("design:type", String)
], CreateBookingAssignmentDto.prototype, "note", void 0);
//# sourceMappingURL=create-booking-assignment.dto.js.map