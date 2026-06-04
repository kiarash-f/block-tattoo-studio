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
exports.WorksController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const works_service_1 = require("./works.service");
const update_work_dto_1 = require("./dto/update-work.dto");
const list_works_dto_1 = require("./dto/list-works.dto");
let WorksController = class WorksController {
    works;
    constructor(works) {
        this.works = works;
    }
    list(artistId, query) {
        return this.works.list(artistId, query);
    }
    update(artistId, workId, dto) {
        return this.works.update(artistId, workId, dto);
    }
    remove(artistId, workId) {
        return this.works.remove(artistId, workId);
    }
};
exports.WorksController = WorksController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List works for an artist (all statuses)', description: 'Returns all portfolio works for an artist, including draft and unpublished items. Supports filtering and pagination.' }),
    (0, swagger_1.ApiParam)({ name: 'artistId', description: 'Artist ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of works.' }),
    __param(0, (0, common_1.Param)('artistId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_works_dto_1.ListWorksDto]),
    __metadata("design:returntype", void 0)
], WorksController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':workId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update work title, tags, or publish status', description: 'Updates metadata or publish status for a specific portfolio work. Use to publish/unpublish or retag a work.' }),
    (0, swagger_1.ApiParam)({ name: 'artistId', description: 'Artist ID (cuid)' }),
    (0, swagger_1.ApiParam)({ name: 'workId', description: 'Work ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Work updated' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Work not found' }),
    __param(0, (0, common_1.Param)('artistId')),
    __param(1, (0, common_1.Param)('workId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_work_dto_1.UpdateWorkDto]),
    __metadata("design:returntype", void 0)
], WorksController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':workId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a work', description: 'Permanently deletes a portfolio work and its associated media files.' }),
    (0, swagger_1.ApiParam)({ name: 'artistId', description: 'Artist ID (cuid)' }),
    (0, swagger_1.ApiParam)({ name: 'workId', description: 'Work ID (cuid)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Work deleted' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Work not found' }),
    __param(0, (0, common_1.Param)('artistId')),
    __param(1, (0, common_1.Param)('workId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], WorksController.prototype, "remove", null);
exports.WorksController = WorksController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Artist Works'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('artists/:artistId/works'),
    __metadata("design:paramtypes", [works_service_1.WorksService])
], WorksController);
//# sourceMappingURL=works.controller.js.map