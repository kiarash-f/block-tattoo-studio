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
exports.CreateStudioStationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_validator_1 = require("class-validator");
class CreateStudioStationDto {
    name;
    code;
    status;
}
exports.CreateStudioStationDto = CreateStudioStationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Station 1' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 60),
    __metadata("design:type", String)
], CreateStudioStationDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'S1' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 20),
    __metadata("design:type", String)
], CreateStudioStationDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: client_1.StationStatus, default: client_1.StationStatus.ACTIVE }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.StationStatus),
    __metadata("design:type", String)
], CreateStudioStationDto.prototype, "status", void 0);
//# sourceMappingURL=create-studio-station.dto.js.map