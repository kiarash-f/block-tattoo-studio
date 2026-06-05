import { Injectable, NotFoundException } from '@nestjs/common';
import { ArtistStatus, Prisma, PublishStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LookbookQueryDto } from './dto/lookbook.query.dto';
import { ArtistPageQueryDto } from './dto/artist-page.query.dto';

@Injectable()
export class PublicArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async lookbook(query: LookbookQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const tag = query.tag?.trim();

    // Artists must be ACTIVE and have at least one PUBLISHED work
    // If tag is provided, must have at least one PUBLISHED work with that tag.
    const where: Prisma.ArtistWhereInput = {
      status: ArtistStatus.ACTIVE,
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
          status: PublishStatus.PUBLISHED,
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

    // Attach worksCount and latestWorks (top 3) per artist.
    // Two-query per artist is OK for limit<=50; if you later want faster,
    // we can optimize with a raw SQL window function.
    const items = await Promise.all(
      artists.map(async (a) => {
        const worksWhere: Prisma.ArtistWorkWhereInput = {
          artistId: a.id,
          status: PublishStatus.PUBLISHED,
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
      }),
    );

    return { page, limit, total, items };
  }

  async artistPageBySlug(slug: string, query: ArtistPageQueryDto) {
    const tag = query.tag?.trim();

    const artist = await this.prisma.artist.findFirst({
      where: { status: ArtistStatus.ACTIVE, slug },
      select: {
        id: true,
        slug: true,
        handle: true,
        displayName: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        bioDe: true,
        bioEn: true,
      },
    });

    if (!artist) throw new NotFoundException('Artist not found');

    const page = query.worksPage ?? 1;
    const limit = query.worksLimit ?? 12;
    const skip = (page - 1) * limit;

    const worksWhere: Prisma.ArtistWorkWhereInput = {
      artistId: artist.id,
      status: PublishStatus.PUBLISHED,
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
}
