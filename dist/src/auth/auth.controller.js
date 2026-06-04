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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const admin_login_dto_1 = require("./dto/admin-login.dto");
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    adminLogin(dto) {
        return this.auth.adminLogin(dto.email, dto.password);
    }
    getMe(req) {
        return this.auth.getMe(req.user.sub);
    }
    async logout(authHeader) {
        const token = authHeader?.replace('Bearer ', '').trim();
        if (token) {
            return { message: 'Logged out successfully.' };
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60 } }),
    (0, common_1.Post)('admin/login'),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin login',
        description: 'Authenticate as admin and receive a JWT token.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Login successful. Returns JWT token.',
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid credentials.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_login_dto_1.AdminLoginDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "adminLogin", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('admin/me'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get current admin',
        description: 'Returns the profile of the currently authenticated admin.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Admin profile.' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('admin/logout'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, swagger_1.ApiOperation)({
        summary: 'Admin logout',
        description: 'Logged out successfully.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Logged out successfully.' }),
    __param(0, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map