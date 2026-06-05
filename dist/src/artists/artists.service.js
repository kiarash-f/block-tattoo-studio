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
exports.ArtistsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const media_service_1 = require("../media/media.service");
const translation_service_1 = require("../translation/translation.service");
const slugify_1 = require("./utils/slugify");
let ArtistsService = class ArtistsService {
    prisma;
    media;
    translation;
    constructor(prisma, media, translation) {
        this.prisma = prisma;
        this.media = media;
        this.translation = translation;
    }
    async createWithMedia(dto, files) {
        const slug = this.resolveSlug(dto.slug, dto.handle, dto.displayName);
        const coverFile = files.cover?.[0];
        const coverUrl = coverFile
            ? (await this.uploadToCloudinary(coverFile, 'artists/covers')).url
            : undefined;
        const workFiles = files.works ?? [];
        const worksMeta = this.parseWorksMeta(workFiles.length, dto.worksMeta);
        const now = new Date();
        const uploadedWorks = workFiles.length > 0
            ? await Promise.all(workFiles.map((f) => this.uploadToCloudinary(f, 'artists/works')))
            : [];
        const translations = await this.translateBio(dto.bio);
        return this.prisma.$transaction(async (tx) => {
            await this.assertUniqueFields({
                slug,
                handle: dto.handle?.trim(),
                email: dto.email?.trim()?.toLowerCase(),
            }, undefined, tx);
            const artist = await tx.artist.create({
                data: {
                    displayName: dto.displayName.trim(),
                    handle: dto.handle?.trim(),
                    slug,
                    email: dto.email?.trim()?.toLowerCase(),
                    phone: dto.phone?.trim(),
                    status: dto.status ?? client_1.ArtistStatus.ACTIVE,
                    bio: dto.bio,
                    avatarUrl: dto.avatarUrl,
                    coverUrl,
                    ...translations,
                },
            });
            if (uploadedWorks.length > 0) {
                const createData = uploadedWorks.map((u, idx) => {
                    const meta = worksMeta[idx];
                    return {
                        artistId: artist.id,
                        title: meta?.title?.trim() ||
                            this.safeTitleFromFilename(workFiles[idx]?.originalname) ||
                            'Untitled',
                        coverUrl: u.url,
                        tags: this.normalizeTags(meta?.tags),
                        status: client_1.PublishStatus.PUBLISHED,
                        publishedAt: now,
                    };
                });
                await tx.artistWork.createMany({ data: createData });
            }
            return artist;
        });
    }
    async updateWithMedia(id, dto, files) {
        const existing = await this.findOne(id);
        const hasSlug = dto.slug !== undefined && dto.slug !== '';
        const nextSlug = hasSlug
            ? this.resolveSlug(dto.slug, dto.handle || existing.handle || undefined, dto.displayName || existing.displayName)
            : (existing.slug ??
                this.resolveSlug(undefined, dto.handle || existing.handle || undefined, dto.displayName || existing.displayName));
        const coverFile = files.cover?.[0];
        const coverUrl = coverFile
            ? (await this.uploadToCloudinary(coverFile, 'artists/covers')).url
            : undefined;
        const workFiles = files.works ?? [];
        const worksMeta = this.parseWorksMeta(workFiles.length, dto.worksMeta);
        const has = (v) => v !== undefined && v !== '';
        const data = {
            ...(has(dto.displayName) ? { displayName: dto.displayName.trim() } : {}),
            ...(has(dto.handle) ? { handle: dto.handle.trim() } : {}),
            ...(hasSlug || !existing.slug ? { slug: nextSlug } : {}),
            ...(has(dto.email) ? { email: dto.email.trim().toLowerCase() } : {}),
            ...(has(dto.phone) ? { phone: dto.phone.trim() } : {}),
            ...(has(dto.status) ? { status: dto.status } : {}),
            ...(has(dto.bio) ? { bio: dto.bio } : {}),
            ...(has(dto.avatarUrl) ? { avatarUrl: dto.avatarUrl } : {}),
            ...(coverUrl ? { coverUrl } : {}),
        };
        const now = new Date();
        const uploadedWorks = workFiles.length > 0
            ? await Promise.all(workFiles.map((f) => this.uploadToCloudinary(f, 'artists/works')))
            : [];
        if (has(dto.bio)) {
            const translations = await this.translateBio(dto.bio);
            Object.assign(data, translations);
        }
        return this.prisma.$transaction(async (tx) => {
            const handle = typeof data.handle === 'string' ? data.handle : undefined;
            const email = typeof data.email === 'string' ? data.email : undefined;
            const slug = typeof data.slug === 'string' ? data.slug : undefined;
            await this.assertUniqueFields({ slug, handle, email }, id, tx);
            const updated = await tx.artist.update({
                where: { id },
                data,
            });
            if (uploadedWorks.length > 0) {
                const createData = uploadedWorks.map((u, idx) => {
                    const meta = worksMeta[idx];
                    return {
                        artistId: updated.id,
                        title: meta?.title?.trim() ||
                            this.safeTitleFromFilename(workFiles[idx]?.originalname) ||
                            'Untitled',
                        coverUrl: u.url,
                        tags: this.normalizeTags(meta?.tags),
                        status: client_1.PublishStatus.PUBLISHED,
                        publishedAt: now,
                    };
                });
                await tx.artistWork.createMany({ data: createData });
            }
            return updated;
        });
    }
    async create(dto) {
        const slug = dto.slug
            ? this.resolveSlug(dto.slug, dto.handle, dto.displayName)
            : undefined;
        const data = {
            displayName: dto.displayName.trim(),
            handle: dto.handle?.trim(),
            slug,
            email: dto.email?.trim()?.toLowerCase(),
            phone: dto.phone?.trim(),
            status: dto.status ?? client_1.ArtistStatus.ACTIVE,
            bio: dto.bio,
            avatarUrl: dto.avatarUrl,
        };
        const artist = await this.prisma.artist.create({ data });
        const translation = await this.translateBio(dto.bio);
        return this.prisma.artist.update({
            where: { id: artist.id },
            data: translation,
        });
    }
    async findOne(id) {
        const artist = await this.prisma.artist.findUnique({
            where: { id },
            include: { works: true },
        });
        if (!artist)
            throw new common_1.NotFoundException('Artist not found');
        return artist;
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
                        { displayName: { contains: q, mode: 'insensitive' } },
                        { handle: { contains: q, mode: 'insensitive' } },
                        { slug: { contains: q, mode: 'insensitive' } },
                        { email: { contains: q, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.artist.findMany({
                where,
                orderBy: [{ status: 'asc' }, { displayName: 'asc' }],
                skip,
                take: limit,
                include: { works: true },
            }),
            this.prisma.artist.count({ where }),
        ]);
        return { page, limit, total, items };
    }
    async update(id, dto) {
        await this.findOne(id);
        const nextSlug = dto.slug !== undefined
            ? this.resolveSlug(dto.slug, dto.handle, dto.displayName)
            : undefined;
        const data = {
            ...(dto.displayName !== undefined
                ? { displayName: dto.displayName.trim() }
                : {}),
            ...(dto.handle !== undefined ? { handle: dto.handle?.trim() } : {}),
            ...(dto.slug !== undefined ? { slug: nextSlug } : {}),
            ...(dto.email !== undefined
                ? { email: dto.email?.trim()?.toLowerCase() }
                : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone?.trim() } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
            ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
            ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        };
        const handle = typeof data.handle === 'string' ? data.handle : undefined;
        const email = typeof data.email === 'string' ? data.email : undefined;
        const slug = typeof data.slug === 'string' ? data.slug : undefined;
        await this.assertUniqueFields({ slug, handle, email }, id);
        const updated = await this.prisma.artist.update({ where: { id }, data });
        if (dto.bio !== undefined) {
            const translations = await this.translateBio(dto.bio);
            return this.prisma.artist.update({ where: { id }, data: translations });
        }
        return updated;
    }
    async deactivate(id) {
        await this.findOne(id);
        return this.prisma.artist.update({
            where: { id },
            data: { status: client_1.ArtistStatus.INACTIVE },
        });
    }
    resolveSlug(explicitSlug, handle, displayName) {
        const base = explicitSlug?.trim() || handle?.trim() || displayName?.trim();
        if (!base)
            throw new common_1.BadRequestException('slug/handle/displayName required');
        const s = (0, slugify_1.slugify)(base);
        if (!s || s.length < 2)
            throw new common_1.BadRequestException('Invalid slug');
        return s;
    }
    parseWorksMeta(expectedLen, json) {
        if (!expectedLen)
            return [];
        if (!json)
            return Array.from({ length: expectedLen }).map(() => undefined);
        try {
            const parsed = JSON.parse(json);
            if (!Array.isArray(parsed))
                throw new Error('worksMeta must be an array');
            return Array.from({ length: expectedLen }).map((_, i) => parsed[i]);
        }
        catch {
            throw new common_1.BadRequestException('Invalid worksMeta JSON');
        }
    }
    normalizeTags(tags) {
        if (!tags?.length)
            return [];
        return Array.from(new Set(tags.map((t) => (0, slugify_1.slugify)(String(t))).filter((t) => t.length > 0)));
    }
    safeTitleFromFilename(name) {
        if (!name)
            return undefined;
        return name.replace(/\.[^/.]+$/, '').trim();
    }
    async uploadToCloudinary(file, folder) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('Empty upload file (check Multer memoryStorage)');
        }
        const { publicId, secureUrl } = await this.media.uploadBuffer(file.buffer, {
            folder,
            filename: this.safeTitleFromFilename(file.originalname),
        });
        return { publicId, url: secureUrl };
    }
    async assertUniqueFields(fields, excludeId, tx = this.prisma) {
        const slug = fields.slug?.trim();
        const handle = fields.handle?.trim();
        const email = fields.email?.trim()?.toLowerCase();
        const OR = [];
        if (slug)
            OR.push({ slug });
        if (handle)
            OR.push({ handle });
        if (email)
            OR.push({ email });
        if (OR.length === 0)
            return;
        const conflict = await tx.artist.findFirst({
            where: {
                AND: [excludeId ? { id: { not: excludeId } } : {}, { OR }],
            },
            select: { id: true },
        });
        if (conflict) {
            throw new common_1.BadRequestException('slug/handle/email already in use');
        }
    }
    async translateBio(bio) {
        if (!bio)
            return { bioDe: undefined, bioEn: undefined };
        const [bioDe, bioEn] = await Promise.all([
            this.translation.translate(bio, 'DE'),
            this.translation.translate(bio, 'EN-GB'),
        ]);
        return { bioDe, bioEn };
    }
};
exports.ArtistsService = ArtistsService;
exports.ArtistsService = ArtistsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        media_service_1.MediaService,
        translation_service_1.TranslationService])
], ArtistsService);
//# sourceMappingURL=artists.service.js.map