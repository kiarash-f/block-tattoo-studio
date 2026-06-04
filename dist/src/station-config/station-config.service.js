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
exports.StationConfigService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let StationConfigService = class StationConfigService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get() {
        const config = await this.prisma.stationConfig.findFirst();
        if (!config)
            throw new common_1.NotFoundException('Station config not set up yet. Use PATCH to create it.');
        return config;
    }
    async upsert(dto) {
        const existing = await this.prisma.stationConfig.findFirst();
        if (existing) {
            return this.prisma.stationConfig.update({
                where: { id: existing.id },
                data: {
                    ...(dto.totalTables !== undefined ? { totalTables: dto.totalTables } : {}),
                    ...(dto.pricePerDay !== undefined ? { pricePerDay: dto.pricePerDay } : {}),
                    ...(dto.monthlyDiscountPercent !== undefined ? { monthlyDiscountPercent: dto.monthlyDiscountPercent } : {}),
                },
            });
        }
        return this.prisma.stationConfig.create({
            data: {
                totalTables: dto.totalTables ?? 5,
                pricePerDay: dto.pricePerDay ?? 0,
                monthlyDiscountPercent: dto.monthlyDiscountPercent ?? 10,
            },
        });
    }
};
exports.StationConfigService = StationConfigService;
exports.StationConfigService = StationConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StationConfigService);
//# sourceMappingURL=station-config.service.js.map