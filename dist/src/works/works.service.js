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
exports.WorksService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const slugify_1 = require("../artists/utils/slugify");
let WorksService = class WorksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(artistId, query) {
        await this.assertArtistExists(artistId);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const where = {
            artistId,
            ...(query.status ? { status: query.status } : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.artistWork.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.artistWork.count({ where }),
        ]);
        return { page, limit, total, items };
    }
    async update(artistId, workId, dto) {
        await this.assertWorkBelongsToArtist(artistId, workId);
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title.trim();
        if (dto.tags !== undefined)
            data.tags = this.normalizeTags(dto.tags);
        if (dto.status !== undefined) {
            data.status = dto.status;
            data.publishedAt =
                dto.status === client_1.PublishStatus.PUBLISHED ? new Date() : null;
        }
        return this.prisma.artistWork.update({ where: { id: workId }, data });
    }
    async remove(artistId, workId) {
        await this.assertWorkBelongsToArtist(artistId, workId);
        await this.prisma.artistWork.delete({ where: { id: workId } });
        return { deleted: true };
    }
    async assertArtistExists(artistId) {
        const artist = await this.prisma.artist.findUnique({
            where: { id: artistId },
            select: { id: true },
        });
        if (!artist)
            throw new common_1.NotFoundException('Artist not found');
    }
    async assertWorkBelongsToArtist(artistId, workId) {
        const work = await this.prisma.artistWork.findUnique({
            where: { id: workId },
            select: { id: true, artistId: true },
        });
        if (!work || work.artistId !== artistId) {
            throw new common_1.NotFoundException('Work not found');
        }
        return work;
    }
    normalizeTags(tags) {
        return Array.from(new Set(tags
            .map((t) => (0, slugify_1.slugify)(String(t)))
            .filter((t) => t.length > 0)));
    }
};
exports.WorksService = WorksService;
exports.WorksService = WorksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorksService);
//# sourceMappingURL=works.service.js.map