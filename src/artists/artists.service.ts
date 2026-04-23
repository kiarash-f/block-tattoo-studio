import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ArtistStatus, PublishStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';

import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { ListArtistsDto } from './dto/list-artists.dto';
import { AdminCreateArtistMultipartDto } from './dto/admin-create-artist.multipart.dto';
import { AdminUpdateArtistMultipartDto } from './dto/admin-update-artist.multipart.dto';
import { WorkMetaDto } from './dto/artist-work-meta.dto';
import { slugify } from './utils/slugify';

@Injectable()
export class ArtistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  // -----------------------------
  // Admin: Create with cover + works (multipart)
  // Auto-publish uploaded works
  // -----------------------------
  async createWithMedia(
    dto: AdminCreateArtistMultipartDto,
    files: { cover?: Express.Multer.File[]; works?: Express.Multer.File[] },
  ) {
    const slug = this.resolveSlug(dto.slug, dto.handle, dto.displayName);

    const coverFile = files.cover?.[0];
    const coverUrl = coverFile
      ? (await this.uploadToCloudinary(coverFile, 'artists/covers')).url
      : undefined;

    const workFiles = files.works ?? [];
    const worksMeta = this.parseWorksMeta(workFiles.length, dto.worksMeta);

    const now = new Date();

    // Upload works BEFORE the transaction to avoid P2028 timeout
    const uploadedWorks =
      workFiles.length > 0
        ? await Promise.all(
            workFiles.map((f) => this.uploadToCloudinary(f, 'artists/works')),
          )
        : [];

    return this.prisma.$transaction(async (tx) => {
      await this.assertUniqueFields(
        {
          slug,
          handle: dto.handle?.trim(),
          email: dto.email?.trim()?.toLowerCase(),
        },
        undefined,
        tx,
      );

      const artist = await tx.artist.create({
        data: {
          displayName: dto.displayName.trim(),
          handle: dto.handle?.trim(),
          slug,
          email: dto.email?.trim()?.toLowerCase(),
          phone: dto.phone?.trim(),
          status: dto.status ?? ArtistStatus.ACTIVE,
          bio: dto.bio,
          avatarUrl: dto.avatarUrl,
          coverUrl,
        },
      });

      if (uploadedWorks.length > 0) {
        const createData: Prisma.ArtistWorkCreateManyInput[] = uploadedWorks.map(
          (u, idx) => {
            const meta = worksMeta[idx];
            return {
              artistId: artist.id,
              title:
                meta?.title?.trim() ||
                this.safeTitleFromFilename(workFiles[idx]?.originalname) ||
                'Untitled',
              coverUrl: u.url,
              tags: this.normalizeTags(meta?.tags),
              status: PublishStatus.PUBLISHED,
              publishedAt: now,
            };
          },
        );

        await tx.artistWork.createMany({ data: createData });
      }

      return artist;
    });
  }

  // -----------------------------
  // Admin: Update with optional cover + optional appended works
  // Auto-publish uploaded works
  // -----------------------------
  async updateWithMedia(
    id: string,
    dto: AdminUpdateArtistMultipartDto,
    files: { cover?: Express.Multer.File[]; works?: Express.Multer.File[] },
  ) {
    const existing = await this.findOne(id);

    const hasSlug = dto.slug !== undefined && dto.slug !== '';
    const nextSlug = hasSlug
      ? this.resolveSlug(
          dto.slug,
          dto.handle || existing.handle || undefined,
          dto.displayName || existing.displayName,
        )
      : existing.slug ??
        this.resolveSlug(
          undefined,
          dto.handle || existing.handle || undefined,
          dto.displayName || existing.displayName,
        );

    const coverFile = files.cover?.[0];
    const coverUrl = coverFile
      ? (await this.uploadToCloudinary(coverFile, 'artists/covers')).url
      : undefined;

    const workFiles = files.works ?? [];
    const worksMeta = this.parseWorksMeta(workFiles.length, dto.worksMeta);

    const has = (v: string | undefined) => v !== undefined && v !== '';

    const data: Prisma.ArtistUpdateInput = {
      ...(has(dto.displayName) ? { displayName: dto.displayName!.trim() } : {}),
      ...(has(dto.handle) ? { handle: dto.handle!.trim() } : {}),
      ...(hasSlug || !existing.slug ? { slug: nextSlug } : {}),
      ...(has(dto.email) ? { email: dto.email!.trim().toLowerCase() } : {}),
      ...(has(dto.phone) ? { phone: dto.phone!.trim() } : {}),
      ...(has(dto.status) ? { status: dto.status } : {}),
      ...(has(dto.bio) ? { bio: dto.bio } : {}),
      ...(has(dto.avatarUrl) ? { avatarUrl: dto.avatarUrl } : {}),
      ...(coverUrl ? { coverUrl } : {}),
    };

    const now = new Date();

    // Upload works BEFORE the transaction to avoid P2028 timeout
    const uploadedWorks =
      workFiles.length > 0
        ? await Promise.all(
            workFiles.map((f) => this.uploadToCloudinary(f, 'artists/works')),
          )
        : [];

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
        const createData: Prisma.ArtistWorkCreateManyInput[] = uploadedWorks.map(
          (u, idx) => {
            const meta = worksMeta[idx];
            return {
              artistId: updated.id,
              title:
                meta?.title?.trim() ||
                this.safeTitleFromFilename(workFiles[idx]?.originalname) ||
                'Untitled',
              coverUrl: u.url,
              tags: this.normalizeTags(meta?.tags),
              status: PublishStatus.PUBLISHED,
              publishedAt: now,
            };
          },
        );

        await tx.artistWork.createMany({ data: createData });
      }

      return updated;
    });
  }

  // -----------------------------
  // Existing CRUD
  // -----------------------------
  async create(dto: CreateArtistDto) {
    const slug = dto.slug
      ? this.resolveSlug(dto.slug, dto.handle, dto.displayName)
      : undefined;

    const data: Prisma.ArtistCreateInput = {
      displayName: dto.displayName.trim(),
      handle: dto.handle?.trim(),
      slug,
      email: dto.email?.trim()?.toLowerCase(),
      phone: dto.phone?.trim(),
      status: dto.status ?? ArtistStatus.ACTIVE,
      bio: dto.bio,
      avatarUrl: dto.avatarUrl,
    };

    return this.prisma.artist.create({ data });
  }

  async findOne(id: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id }, include: { works: true } });
    if (!artist) throw new NotFoundException('Artist not found');
    return artist;
  }

  async list(query: ListArtistsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.ArtistWhereInput = {
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

  async update(id: string, dto: UpdateArtistDto) {
    await this.findOne(id);

    const nextSlug =
      dto.slug !== undefined
        ? this.resolveSlug(dto.slug, dto.handle, dto.displayName)
        : undefined;

    const data: Prisma.ArtistUpdateInput = {
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

    return this.prisma.artist.update({ where: { id }, data });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.artist.update({
      where: { id },
      data: { status: ArtistStatus.INACTIVE },
    });
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  private resolveSlug(
    explicitSlug?: string,
    handle?: string,
    displayName?: string,
  ) {
    const base = explicitSlug?.trim() || handle?.trim() || displayName?.trim();
    if (!base) throw new BadRequestException('slug/handle/displayName required');

    const s = slugify(base);
    if (!s || s.length < 2) throw new BadRequestException('Invalid slug');

    return s;
  }

  private parseWorksMeta(
    expectedLen: number,
    json?: string,
  ): (WorkMetaDto | undefined)[] {
    if (!expectedLen) return [];
    if (!json) return Array.from({ length: expectedLen }).map(() => undefined);

    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error('worksMeta must be an array');
      return Array.from({ length: expectedLen }).map((_, i) => parsed[i]);
    } catch {
      throw new BadRequestException('Invalid worksMeta JSON');
    }
  }

  private normalizeTags(tags?: string[]) {
    if (!tags?.length) return [];
    return Array.from(
      new Set(
        tags
          .map((t) => slugify(String(t)))
          .filter((t) => t.length > 0),
      ),
    );
  }

  private safeTitleFromFilename(name?: string) {
    if (!name) return undefined;
    return name.replace(/\.[^/.]+$/, '').trim();
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Empty upload file (check Multer memoryStorage)',
      );
    }

    const { publicId, secureUrl } = await this.media.uploadBuffer(file.buffer, {
      folder,
      filename: this.safeTitleFromFilename(file.originalname),
    });

    return { publicId, url: secureUrl };
  }

  private async assertUniqueFields(
    fields: { slug?: string; handle?: string; email?: string },
    excludeId?: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const slug = fields.slug?.trim();
    const handle = fields.handle?.trim();
    const email = fields.email?.trim()?.toLowerCase();

    const OR: Prisma.ArtistWhereInput[] = [];
    if (slug) OR.push({ slug });
    if (handle) OR.push({ handle });
    if (email) OR.push({ email });

    if (OR.length === 0) return;

    const conflict = await tx.artist.findFirst({
      where: {
        AND: [excludeId ? { id: { not: excludeId } } : {}, { OR }],
      },
      select: { id: true },
    });

    if (conflict) {
      throw new BadRequestException('slug/handle/email already in use');
    }
  }
}