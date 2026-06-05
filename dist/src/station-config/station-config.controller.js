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
exports.StationConfigController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const station_config_service_1 = require("./station-config.service");
const update_station_config_dto_1 = require("./dto/update-station-config.dto");
let StationConfigController = class StationConfigController {
    service;
    constructor(service) {
        this.service = service;
    }
    get() {
        return this.service.get();
    }
    upsert(dto) {
        return this.service.upsert(dto);
    }
};
exports.StationConfigController = StationConfigController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get station config',
        description: 'Returns the current guest artist station configuration (total tables, price per day, monthly discount).',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Current config.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Config not set up yet.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StationConfigController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Update station config',
        description: 'Updates (or creates on first use) the station config. All fields are optional — only send what you want to change.',
    }),
    (0, swagger_1.ApiBody)({ type: update_station_config_dto_1.UpdateStationConfigDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Config updated.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_station_config_dto_1.UpdateStationConfigDto]),
    __metadata("design:returntype", void 0)
], StationConfigController.prototype, "upsert", null);
exports.StationConfigController = StationConfigController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Station Config'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('admin/station-config'),
    __metadata("design:paramtypes", [station_config_service_1.StationConfigService])
], StationConfigController);
//# sourceMappingURL=station-config.controller.js.map