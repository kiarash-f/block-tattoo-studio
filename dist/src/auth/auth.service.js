"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const cache_manager_1 = require("@nestjs/cache-manager");
let AuthService = class AuthService {
    prisma;
    jwt;
    cache;
    constructor(prisma, jwt, cache) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.cache = cache;
    }
    async adminLogin(email, password) {
        const admin = await this.prisma.adminUser.findUnique({ where: { email } });
        if (!admin || !admin.isActive)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        await this.prisma.adminUser.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
        });
        const accessToken = await this.jwt.signAsync({
            sub: admin.id,
            role: 'ADMIN',
            email: admin.email,
        });
        return { accessToken };
    }
    async getMe(adminId) {
        const admin = await this.prisma.adminUser.findUnique({
            where: { id: adminId },
            select: {
                id: true,
                email: true,
                displayName: true,
                isActive: true,
                lastLoginAt: true,
                createdAt: true,
            },
        });
        if (!admin)
            throw new common_1.NotFoundException('Admin not found');
        return admin;
    }
    async revokeTokens(token) {
        try {
            const decoded = this.jwt.decode(token);
            if (!decoded?.exp)
                return;
            const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
            if (ttlSeconds > 0) {
                await this.cache.set(`blocklist:${token}`, '1', ttlSeconds * 1000);
            }
        }
        catch { }
    }
    async isRevoked(token) {
        const val = await this.cache.get(`blocklist:${token}`);
        return val !== null && val !== undefined;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map