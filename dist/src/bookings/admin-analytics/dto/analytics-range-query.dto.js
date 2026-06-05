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
exports.AnalyticsUtmQueryDto = exports.AnalyticsTimeseriesQueryDto = exports.AnalyticsRangeQueryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class AnalyticsRangeQueryDto {
    from;
    to;
    timezone;
    artistId;
    stationId;
    includeWalkIn;
}
exports.AnalyticsRangeQueryDto = AnalyticsRangeQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Start date (YYYY-MM-DD), interpreted in timezone',
        example: '2026-02-20',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], AnalyticsRangeQueryDto.prototype, "from", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'End date (YYYY-MM-DD), interpreted in timezone',
        example: '2026-02-23',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], AnalyticsRangeQueryDto.prototype, "to", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: 'Europe/Berlin', example: 'Europe/Berlin' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyticsRangeQueryDto.prototype, "timezone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyticsRangeQueryDto.prototype, "artistId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AnalyticsRangeQueryDto.prototype, "stationId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'If true, include WALK_IN in analytics',
        default: true,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], AnalyticsRangeQueryDto.prototype, "includeWalkIn", void 0);
class AnalyticsTimeseriesQueryDto extends AnalyticsRangeQueryDto {
    granularity;
}
exports.AnalyticsTimeseriesQueryDto = AnalyticsTimeseriesQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Bucket size',
        enum: ['day', 'week', 'month'],
        example: 'day',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['day', 'week', 'month']),
    __metadata("design:type", String)
], AnalyticsTimeseriesQueryDto.prototype, "granularity", void 0);
class AnalyticsUtmQueryDto extends AnalyticsRangeQueryDto {
    dimension;
}
exports.AnalyticsUtmQueryDto = AnalyticsUtmQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Which UTM field to group by',
        enum: ['campaign', 'adset', 'ad'],
        example: 'campaign',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['campaign', 'adset', 'ad']),
    __metadata("design:type", String)
], AnalyticsUtmQueryDto.prototype, "dimension", void 0);
//# sourceMappingURL=analytics-range-query.dto.js.map