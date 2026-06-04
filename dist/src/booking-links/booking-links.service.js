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
exports.BookingLinksService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto = __importStar(require("crypto"));
const argon2 = __importStar(require("argon2"));
let BookingLinksService = class BookingLinksService {
    prisma;
    config;
    pepper;
    publicBaseUrl;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.pepper = this.config.get('BOOKING_LINK_TOKEN_PEPPER', '');
        this.publicBaseUrl = this.config.get('PUBLIC_BASE_URL', '');
        if (!this.pepper || this.pepper.length < 32) {
            throw new Error('BOOKING_LINK_TOKEN_PEPPER is missing/too short');
        }
        if (!this.publicBaseUrl) {
            throw new Error('PUBLIC_BASE_URL is missing');
        }
    }
    generateSecret(bytes = 32) {
        return crypto
            .randomBytes(bytes)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/g, '');
    }
    async hashSecret(secret) {
        return argon2.hash(`${secret}:${this.pepper}`, {
            type: argon2.argon2id,
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
        });
    }
    async verifySecret(secret, secretHash) {
        return argon2.verify(secretHash, `${secret}:${this.pepper}`);
    }
    async createToken(params) {
        if (params.expiresAt.getTime() <= Date.now()) {
            throw new common_1.BadRequestException('expiresAt must be in the future');
        }
        const booking = await this.prisma.bookingRequest.findUnique({
            where: { id: params.bookingRequestId },
            select: { id: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('BookingRequest not found');
        const secret = this.generateSecret(32);
        const secretHash = await this.hashSecret(secret);
        const token = await this.prisma.bookingLinkToken.create({
            data: {
                bookingRequestId: params.bookingRequestId,
                secretHash,
                scopes: params.scopes,
                expiresAt: params.expiresAt,
            },
            select: { id: true, expiresAt: true, scopes: true },
        });
        const url = `${this.publicBaseUrl.replace(/\/+$/, '')}/public/booking/${token.id}.${secret}`;
        return {
            url,
            tokenId: token.id,
            expiresAt: token.expiresAt,
            scopes: token.scopes,
        };
    }
    async validateToken(compoundToken) {
        const [tokenId, secret] = compoundToken.split('.', 2);
        if (!tokenId || !secret)
            throw new common_1.BadRequestException('Invalid token format');
        const token = await this.prisma.bookingLinkToken.findUnique({
            where: { id: tokenId },
            select: {
                id: true,
                bookingRequestId: true,
                secretHash: true,
                scopes: true,
                status: true,
                expiresAt: true,
            },
        });
        if (!token)
            throw new common_1.NotFoundException('Token not found');
        if (token.status !== 'ACTIVE')
            throw new common_1.BadRequestException(`Token is not active (${token.status})`);
        if (token.expiresAt.getTime() <= Date.now())
            throw new common_1.BadRequestException('Token expired');
        const ok = await this.verifySecret(secret, token.secretHash);
        if (!ok)
            throw new common_1.BadRequestException('Invalid token secret');
        await this.prisma.bookingLinkToken.update({
            where: { id: token.id },
            data: { lastUsedAt: new Date(), useCount: { increment: 1 } },
        });
        return {
            tokenId: token.id,
            bookingRequestId: token.bookingRequestId,
            scopes: token.scopes,
        };
    }
};
exports.BookingLinksService = BookingLinksService;
exports.BookingLinksService = BookingLinksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], BookingLinksService);
//# sourceMappingURL=booking-links.service.js.map