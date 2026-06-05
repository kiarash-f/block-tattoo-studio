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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminUsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const SAFE_SELECT = {
    id: true,
    email: true,
    displayName: true,
    isActive: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
};
let AdminUsersService = class AdminUsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.adminUser.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException('Email already in use');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        return this.prisma.adminUser.create({
            data: {
                email: dto.email,
                passwordHash,
                displayName: dto.displayName ?? null,
            },
            select: SAFE_SELECT,
        });
    }
    async list(query) {
        const where = query.isActive !== undefined ? { isActive: query.isActive } : {};
        return this.prisma.adminUser.findMany({
            where,
            select: SAFE_SELECT,
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const admin = await this.prisma.adminUser.findUnique({
            where: { id },
            select: SAFE_SELECT,
        });
        if (!admin) {
            throw new common_1.NotFoundException('Admin user not found');
        }
        return admin;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.email) {
            const conflict = await this.prisma.adminUser.findUnique({
                where: { email: dto.email },
            });
            if (conflict && conflict.id !== id) {
                throw new common_1.ConflictException('Email already in use');
            }
        }
        return this.prisma.adminUser.update({
            where: { id },
            data: dto,
            select: SAFE_SELECT,
        });
    }
    async deactivate(id) {
        await this.findOne(id);
        return this.prisma.adminUser.update({
            where: { id },
            data: { isActive: false },
            select: SAFE_SELECT,
        });
    }
    async changePassword(id, dto) {
        const admin = await this.prisma.adminUser.findUnique({ where: { id } });
        if (!admin)
            throw new common_1.NotFoundException('Admin user not found');
        const valid = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Current password is incorrect');
        if (dto.currentPassword === dto.newPassword)
            throw new common_1.BadRequestException('New password must be different from current password');
        const passwordHash = await bcrypt.hash(dto.newPassword, 12);
        await this.prisma.adminUser.update({
            where: { id },
            data: { passwordHash },
        });
        return { message: 'Password changed successfully' };
    }
    async seed(dto) {
        const count = await this.prisma.adminUser.count();
        if (count > 0)
            throw new common_1.BadRequestException('Admin account already exists. Use the create endpoint.');
        return this.create(dto);
    }
};
exports.AdminUsersService = AdminUsersService;
exports.AdminUsersService = AdminUsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminUsersService);
//# sourceMappingURL=admin-users.service.js.map