import { Injectable, NotFoundException } from '@nestjs/common';
import { PublishStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateWorkDto } from './dto/update-work.dto';
import { ListWorksDto } from './dto/list-works.dto';
import { slugify } from '../artists/utils/slugify';

@Injectable()
export class WorksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(artistId: string, query: ListWorksDto) {
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

  async update(artistId: string, workId: string, dto: UpdateWorkDto) {
    await this.assertWorkBelongsToArtist(artistId, workId);

    const data: Record<string, unknown> = {};

    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.tags !== undefined) data.tags = this.normalizeTags(dto.tags);
    if (dto.status !== undefined) {
      data.status = dto.status;
      data.publishedAt =
        dto.status === PublishStatus.PUBLISHED ? new Date() : null;
    }

    return this.prisma.artistWork.update({ where: { id: workId }, data });
  }

  async remove(artistId: string, workId: string) {
    await this.assertWorkBelongsToArtist(artistId, workId);
    await this.prisma.artistWork.delete({ where: { id: workId } });
    return { deleted: true };
  }

  private async assertArtistExists(artistId: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { id: true },
    });
    if (!artist) throw new NotFoundException('Artist not found');
  }

  private async assertWorkBelongsToArtist(artistId: string, workId: string) {
    const work = await this.prisma.artistWork.findUnique({
      where: { id: workId },
      select: { id: true, artistId: true },
    });
    if (!work || work.artistId !== artistId) {
      throw new NotFoundException('Work not found');
    }
    return work;
  }

  private normalizeTags(tags: string[]) {
    return Array.from(
      new Set(
        tags
          .map((t) => slugify(String(t)))
          .filter((t) => t.length > 0),
      ),
    );
  }
}
