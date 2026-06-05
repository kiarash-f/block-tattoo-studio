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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const analytics_range_query_dto_1 = require("./dto/analytics-range-query.dto");
const admin_analytics_service_1 = require("./admin-analytics.service");
const passport_1 = require("@nestjs/passport");
const common_2 = require("@nestjs/common");
let AdminAnalyticsController = class AdminAnalyticsController {
    analytics;
    constructor(analytics) {
        this.analytics = analytics;
    }
    overview(q) {
        return this.analytics.getOverview(q);
    }
    timeseries(q) {
        return this.analytics.getTimeseries(q);
    }
    sources(q) {
        return this.analytics.getSources(q);
    }
    utm(q) {
        return this.analytics.getUtm(q);
    }
};
exports.AdminAnalyticsController = AdminAnalyticsController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get analytics overview for a date range',
        description: 'Returns total bookings, breakdown by type and status, revenue metrics, and other summary statistics for the given date range.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Analytics overview returned.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_range_query_dto_1.AnalyticsRangeQueryDto]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('timeseries'),
    (0, swagger_1.ApiOperation)({
        summary: 'Analytics timeseries for a date range',
        description: 'Returns daily booking counts over the specified date range, grouped by the requested interval.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Timeseries data returned.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_range_query_dto_1.AnalyticsTimeseriesQueryDto]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "timeseries", null);
__decorate([
    (0, common_1.Get)('sources'),
    (0, swagger_1.ApiOperation)({
        summary: 'Counts grouped by booking source',
        description: 'Returns booking counts broken down by referral source (e.g. instagram, google, walk-in) for the given date range.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Source breakdown returned.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_range_query_dto_1.AnalyticsRangeQueryDto]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "sources", null);
__decorate([
    (0, common_1.Get)('utm'),
    (0, swagger_1.ApiOperation)({
        summary: 'Counts grouped by UTM dimension',
        description: 'Returns booking counts broken down by UTM campaign, source, or medium for the given date range.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'UTM breakdown returned.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_range_query_dto_1.AnalyticsUtmQueryDto]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsController.prototype, "utm", null);
exports.AdminAnalyticsController = AdminAnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Analytics'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.Controller)('admin/analytics'),
    (0, common_2.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [admin_analytics_service_1.AdminAnalyticsService])
], AdminAnalyticsController);
//# sourceMappingURL=admin-analytics.controller.js.map