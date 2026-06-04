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
exports.StudioStationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let StudioStationsService = class StudioStationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const name = dto.name.trim();
        const code = dto.code?.trim();
        await this.assertUniqueName(name);
        if (code)
            await this.assertUniqueCode(code);
        return this.prisma.studioStation.create({
            data: {
                name,
                code,
                status: dto.status ?? client_1.StationStatus.ACTIVE,
            },
        });
    }
    async findOne(id) {
        const station = await this.prisma.studioStation.findUnique({
            where: { id },
        });
        if (!station)
            throw new common_1.NotFoundException('Studio station not found');
        return station;
    }
    async list(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const q = query.q?.trim();
        const where = {
            ...(query.status ? { status: query.status } : {}),
            ...(q
                ? {
                    OR: [
                        { name: { contains: q, mode: 'insensitive' } },
                        { code: { contains: q, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.studioStation.findMany({
                where,
                orderBy: [{ status: 'asc' }, { name: 'asc' }],
                skip,
                take: limit,
            }),
            this.prisma.studioStation.count({ where }),
        ]);
        return { page, limit, total, items };
    }
    async update(id, dto) {
        await this.findOne(id);
        const name = dto.name?.trim();
        if (name)
            await this.assertUniqueName(name, id);
        const code = dto.code?.trim();
        if (code)
            await this.assertUniqueCode(code, id);
        return this.prisma.studioStation.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                ...(dto.code !== undefined ? { code: dto.code?.trim() } : {}),
                ...(dto.status !== undefined ? { status: dto.status } : {}),
            },
        });
    }
    async deactivate(id) {
        await this.findOne(id);
        return this.prisma.studioStation.update({
            where: { id },
            data: { status: client_1.StationStatus.INACTIVE },
        });
    }
    async assertUniqueName(name, excludeId) {
        const existing = await this.prisma.studioStation.findFirst({
            where: {
                AND: [
                    { name },
                    { studioId: null },
                    excludeId ? { id: { not: excludeId } } : {},
                ],
            },
            select: { id: true },
        });
        if (existing)
            throw new common_1.BadRequestException('Station name already exists');
    }
    async assertUniqueCode(code, excludeId) {
        const existing = await this.prisma.studioStation.findFirst({
            where: {
                AND: [
                    { code },
                    { studioId: null },
                    excludeId ? { id: { not: excludeId } } : {},
                ],
            },
            select: { id: true },
        });
        if (existing)
            throw new common_1.BadRequestException('Station code already exists');
    }
};
exports.StudioStationsService = StudioStationsService;
exports.StudioStationsService = StudioStationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudioStationsService);
//# sourceMappingURL=studio-stations.service.js.map