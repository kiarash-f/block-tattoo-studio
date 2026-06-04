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
exports.PublicArtistsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let PublicArtistsService = class PublicArtistsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async lookbook(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const q = query.q?.trim();
        const tag = query.tag?.trim();
        const where = {
            status: client_1.ArtistStatus.ACTIVE,
            ...(q
                ? {
                    OR: [
                        { displayName: { contains: q, mode: 'insensitive' } },
                        { handle: { contains: q, mode: 'insensitive' } },
                        { slug: { contains: q, mode: 'insensitive' } },
                    ],
                }
                : {}),
            works: {
                some: {
                    status: client_1.PublishStatus.PUBLISHED,
                    ...(tag ? { tags: { has: tag } } : {}),
                },
            },
        };
        const [total, artists] = await this.prisma.$transaction([
            this.prisma.artist.count({ where }),
            this.prisma.artist.findMany({
                where,
                orderBy: [{ displayName: 'asc' }],
                skip,
                take: limit,
                select: {
                    id: true,
                    slug: true,
                    handle: true,
                    displayName: true,
                    avatarUrl: true,
                    coverUrl: true,
                },
            }),
        ]);
        const items = await Promise.all(artists.map(async (a) => {
            const worksWhere = {
                artistId: a.id,
                status: client_1.PublishStatus.PUBLISHED,
                ...(tag ? { tags: { has: tag } } : {}),
            };
            const [worksCount, latestWorks] = await Promise.all([
                this.prisma.artistWork.count({ where: worksWhere }),
                this.prisma.artistWork.findMany({
                    where: worksWhere,
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                    select: {
                        id: true,
                        title: true,
                        coverUrl: true,
                        tags: true,
                        createdAt: true,
                    },
                }),
            ]);
            return {
                id: a.id,
                slug: a.slug,
                handle: a.handle,
                displayName: a.displayName,
                avatarUrl: a.avatarUrl,
                coverUrl: a.coverUrl,
                worksCount,
                latestWorks: latestWorks.map((w) => ({
                    id: w.id,
                    title: w.title,
                    coverUrl: w.coverUrl,
                    tags: w.tags,
                    createdAt: w.createdAt.toISOString(),
                })),
            };
        }));
        return { page, limit, total, items };
    }
    async artistPageBySlug(slug, query) {
        const tag = query.tag?.trim();
        const artist = await this.prisma.artist.findFirst({
            where: { status: client_1.ArtistStatus.ACTIVE, slug },
            select: {
                id: true,
                slug: true,
                handle: true,
                displayName: true,
                avatarUrl: true,
                coverUrl: true,
                bio: true,
            },
        });
        if (!artist)
            throw new common_1.NotFoundException('Artist not found');
        const page = query.worksPage ?? 1;
        const limit = query.worksLimit ?? 12;
        const skip = (page - 1) * limit;
        const worksWhere = {
            artistId: artist.id,
            status: client_1.PublishStatus.PUBLISHED,
            ...(tag ? { tags: { has: tag } } : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.artistWork.findMany({
                where: worksWhere,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    coverUrl: true,
                    tags: true,
                    createdAt: true,
                },
            }),
            this.prisma.artistWork.count({ where: worksWhere }),
        ]);
        return {
            artist,
            works: {
                page,
                limit,
                total,
                hasMore: skip + items.length < total,
                items: items.map((w) => ({
                    id: w.id,
                    title: w.title,
                    coverUrl: w.coverUrl,
                    tags: w.tags,
                    createdAt: w.createdAt.toISOString(),
                })),
            },
        };
    }
};
exports.PublicArtistsService = PublicArtistsService;
exports.PublicArtistsService = PublicArtistsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PublicArtistsService);
//# sourceMappingURL=public-artists.service.js.map