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
exports.AdminUsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const admin_users_service_1 = require("./admin-users.service");
const create_admin_user_dto_1 = require("./dto/create-admin-user.dto");
const list_admin_users_dto_1 = require("./dto/list-admin-users.dto");
const change_password_dto_1 = require("./dto/change-password.dto");
const update_admin_user_dto_1 = require("./dto/update-admin-user.dto");
let AdminUsersController = class AdminUsersController {
    service;
    constructor(service) {
        this.service = service;
    }
    seed(dto) {
        return this.service.seed(dto);
    }
    create(dto) {
        return this.service.create(dto);
    }
    list(query) {
        return this.service.list(query);
    }
    findOne(id) {
        return this.service.findOne(id);
    }
    update(id, dto) {
        return this.service.update(id, dto);
    }
    deactivate(id) {
        return this.service.deactivate(id);
    }
    changePassword(id, dto) {
        return this.service.changePassword(id, dto);
    }
};
exports.AdminUsersController = AdminUsersController;
__decorate([
    (0, common_1.Post)('seed'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, swagger_1.ApiOperation)({
        summary: 'First-time admin setup',
        description: 'Creates the first admin account. Fails with 400 if any admin already exists.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Admin user created.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Admin user already exists.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_admin_user_dto_1.CreateAdminUserDto]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "seed", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, swagger_1.ApiOperation)({ summary: 'Create New Admin User' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Admin user created.' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already in use.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_admin_user_dto_1.CreateAdminUserDto]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, swagger_1.ApiOperation)({
        summary: 'List all admin users',
        description: 'Optionally filter by isActive status.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of admin users returned.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_admin_users_dto_1.ListAdminUsersDto]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single admin user' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Admin found.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Admin not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, swagger_1.ApiOperation)({ summary: 'Update admin Email or Display Name' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Admin updated.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_admin_user_dto_1.UpdateAdminUserDto]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate an admin user' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Admin deactivated.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)(':id/change-password'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, swagger_1.ApiOperation)({ summary: 'Change an admin user password' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Password changed.' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Current password is incorrect.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, change_password_dto_1.ChangePasswordDto]),
    __metadata("design:returntype", void 0)
], AdminUsersController.prototype, "changePassword", null);
exports.AdminUsersController = AdminUsersController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Users'),
    (0, common_1.Controller)('admin/users'),
    __metadata("design:paramtypes", [admin_users_service_1.AdminUsersService])
], AdminUsersController);
//# sourceMappingURL=admin-users.controller.js.map