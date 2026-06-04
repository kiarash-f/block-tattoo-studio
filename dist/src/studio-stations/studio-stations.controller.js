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
exports.StudioStationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const studio_stations_service_1 = require("./studio-stations.service");
const create_studio_station_dto_1 = require("./dto/create-studio-station.dto");
const update_studio_station_dto_1 = require("./dto/update-studio-station.dto");
const list_studio_stations_dto_1 = require("./dto/list-studio-stations.dto");
const passport_1 = require("@nestjs/passport");
let StudioStationsController = class StudioStationsController {
    stations;
    constructor(stations) {
        this.stations = stations;
    }
    create(dto) {
        return this.stations.create(dto);
    }
    list(query) {
        return this.stations.list(query);
    }
    findOne(id) {
        return this.stations.findOne(id);
    }
    update(id, dto) {
        return this.stations.update(id, dto);
    }
    deactivate(id) {
        return this.stations.deactivate(id);
    }
};
exports.StudioStationsController = StudioStationsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new studio station', description: 'Creates a new bookable studio station (e.g. tattoo chair, consultation room).' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Station created' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_studio_station_dto_1.CreateStudioStationDto]),
    __metadata("design:returntype", void 0)
], StudioStationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List studio stations with filtering and pagination',
        description: 'Returns a paginated list of studio stations. Supports filtering by status (ACTIVE/INACTIVE) and a text search query.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paged list of stations.' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'] }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, example: 1 }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20 }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_studio_stations_dto_1.ListStudioStationsDto]),
    __metadata("design:returntype", void 0)
], StudioStationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get station by ID', description: 'Returns details for a single studio station.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Station ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Station found.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Station not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudioStationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update station', description: 'Updates name, description, or status of a studio station.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Station ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Station updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Station not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_studio_station_dto_1.UpdateStudioStationDto]),
    __metadata("design:returntype", void 0)
], StudioStationsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate station (soft delete)', description: 'Sets the station status to INACTIVE. The station is excluded from scheduling but data is retained.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Station ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Station deactivated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Station not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudioStationsController.prototype, "deactivate", null);
exports.StudioStationsController = StudioStationsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Stations'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.Controller)('studio-stations'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [studio_stations_service_1.StudioStationsService])
], StudioStationsController);
//# sourceMappingURL=studio-stations.controller.js.map