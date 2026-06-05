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
exports.ArticlesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const media_service_1 = require("../media/media.service");
const translation_service_1 = require("../translation/translation.service");
const slugify_1 = require("./utils/slugify");
let ArticlesService = class ArticlesService {
    prisma;
    media;
    translation;
    constructor(prisma, media, translation) {
        this.prisma = prisma;
        this.media = media;
        this.translation = translation;
    }
    async create(dto, authorId, coverFile) {
        const slug = await this.resolveUniqueSlug(dto.slug ?? dto.title);
        const coverUrl = coverFile
            ? (await this.media.uploadBuffer(coverFile.buffer, {
                folder: 'articles/covers',
                filename: dto.title.trim(),
            })).secureUrl
            : dto.coverUrl;
        const article = await this.prisma.article.create({
            data: {
                title: dto.title.trim(),
                slug,
                excerpt: dto.excerpt?.trim(),
                content: dto.content,
                coverUrl,
                tags: dto.tags ?? [],
                status: dto.status ?? client_1.PublishStatus.DRAFT,
                publishedAt: dto.status === client_1.PublishStatus.PUBLISHED ? new Date() : null,
                authorId,
            },
        });
        const translations = await this.translateArticle({
            title: dto.title.trim(),
            excerpt: dto.excerpt?.trim(),
            content: dto.content,
        });
        return this.prisma.article.update({
            where: { id: article.id },
            data: translations,
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const q = query.q?.trim();
        const where = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.tag ? { tags: { has: query.tag } } : {}),
            ...(q
                ? {
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { tags: { has: q } },
                    ],
                }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.article.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }],
                skip,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    excerpt: true,
                    coverUrl: true,
                    tags: true,
                    status: true,
                    publishedAt: true,
                    createdAt: true,
                    updatedAt: true,
                    author: { select: { id: true, displayName: true } },
                },
            }),
            this.prisma.article.count({ where }),
        ]);
        return { page, limit, total, items };
    }
    async findOne(id) {
        const article = await this.prisma.article.findUnique({
            where: { id },
            include: { author: { select: { id: true, displayName: true } } },
        });
        if (!article)
            throw new common_1.NotFoundException('Article not found');
        return article;
    }
    async update(id, dto, coverFile) {
        await this.findOne(id);
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title.trim();
        if (dto.slug !== undefined) {
            data.slug = await this.resolveUniqueSlug(dto.slug, id);
        }
        else if (dto.title !== undefined) {
            data.slug = await this.resolveUniqueSlug(dto.title, id);
        }
        if (dto.excerpt !== undefined)
            data.excerpt = dto.excerpt?.trim();
        if (dto.content !== undefined)
            data.content = dto.content;
        if (coverFile) {
            data.coverUrl = (await this.media.uploadBuffer(coverFile.buffer, {
                folder: 'articles/covers',
            })).secureUrl;
        }
        else if (dto.coverUrl !== undefined) {
            data.coverUrl = dto.coverUrl;
        }
        if (dto.tags !== undefined)
            data.tags = dto.tags;
        if (dto.status !== undefined)
            data.status = dto.status;
        const translatable = {};
        if (dto.title !== undefined)
            translatable.title = dto.title.trim();
        if (dto.excerpt !== undefined)
            translatable.excerpt = dto.excerpt?.trim();
        if (dto.content !== undefined)
            translatable.content = dto.content;
        if (Object.keys(translatable).length > 0) {
            const translations = await this.translateArticle(translatable);
            Object.assign(data, translations);
        }
        return this.prisma.article.update({ where: { id }, data });
    }
    async publish(id) {
        const article = await this.findOne(id);
        if (article.status === client_1.PublishStatus.PUBLISHED) {
            throw new common_1.BadRequestException('Article is already published');
        }
        return this.prisma.article.update({
            where: { id },
            data: { status: client_1.PublishStatus.PUBLISHED, publishedAt: new Date() },
        });
    }
    async unpublish(id) {
        const article = await this.findOne(id);
        if (article.status === client_1.PublishStatus.DRAFT) {
            throw new common_1.BadRequestException('Article is already a draft');
        }
        return this.prisma.article.update({
            where: { id },
            data: { status: client_1.PublishStatus.DRAFT },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.article.delete({ where: { id } });
    }
    async findPublished(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const q = query.q?.trim();
        const where = {
            status: client_1.PublishStatus.PUBLISHED,
            ...(query.tag ? { tags: { has: query.tag } } : {}),
            ...(q
                ? {
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { tags: { has: q } },
                    ],
                }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.article.findMany({
                where,
                orderBy: [{ publishedAt: 'desc' }],
                skip,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    excerpt: true,
                    coverUrl: true,
                    tags: true,
                    publishedAt: true,
                },
            }),
            this.prisma.article.count({ where }),
        ]);
        return { page, limit, total, items };
    }
    async findBySlug(slug) {
        const article = await this.prisma.article.findUnique({
            where: { slug },
            select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                content: true,
                coverUrl: true,
                tags: true,
                status: true,
                publishedAt: true,
                author: { select: { displayName: true } },
            },
        });
        if (!article || article.publishedAt === null) {
            throw new common_1.NotFoundException('Article not found');
        }
        return article;
    }
    async resolveUniqueSlug(base, excludeId) {
        const baseSlug = (0, slugify_1.slugify)(base);
        let candidate = baseSlug;
        let counter = 2;
        while (true) {
            const existing = await this.prisma.article.findUnique({
                where: { slug: candidate },
                select: { id: true },
            });
            if (!existing || existing.id === excludeId)
                return candidate;
            candidate = `${baseSlug}-${counter++}`;
        }
    }
    async translateArticle(fields) {
        const results = {};
        await Promise.all([
            fields.title &&
                this.translation.translate(fields.title, 'DE').then((v) => {
                    results.titleDe = v;
                }),
            fields.title &&
                this.translation.translate(fields.title, 'EN-GB').then((v) => {
                    results.titleEn = v;
                }),
            fields.excerpt &&
                this.translation.translate(fields.excerpt, 'DE').then((v) => {
                    results.excerptDe = v;
                }),
            fields.excerpt &&
                this.translation.translate(fields.excerpt, 'EN-GB').then((v) => {
                    results.excerptEn = v;
                }),
            fields.content &&
                this.translation.translate(fields.content, 'DE').then((v) => {
                    results.contentDe = v;
                }),
            fields.content &&
                this.translation.translate(fields.content, 'EN-GB').then((v) => {
                    results.contentEn = v;
                }),
        ].filter(Boolean));
        return results;
    }
};
exports.ArticlesService = ArticlesService;
exports.ArticlesService = ArticlesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        media_service_1.MediaService,
        translation_service_1.TranslationService])
], ArticlesService);
//# sourceMappingURL=articles.service.js.map