import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PublishStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';
import { slugify } from './utils/slugify';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Admin ────────────────────────────────────────────────────────────────

  async create(dto: CreateArticleDto, authorId: string) {
    const slug = await this.resolveUniqueSlug(dto.slug ?? dto.title);

    return this.prisma.article.create({
      data: {
        title: dto.title.trim(),
        slug,
        excerpt: dto.excerpt?.trim(),
        content: dto.content,
        coverUrl: dto.coverUrl,
        tags: dto.tags ?? [],
        status: dto.status ?? PublishStatus.DRAFT,
        authorId,
      },
    });
  }

  async findAll(query: ListArticlesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.ArticleWhereInput = {
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

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { author: { select: { id: true, displayName: true } } },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async update(id: string, dto: UpdateArticleDto) {
    await this.findOne(id);

    const data: Prisma.ArticleUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.slug !== undefined) {
      data.slug = await this.resolveUniqueSlug(dto.slug, id);
    } else if (dto.title !== undefined) {
      // Re-slug only when title changes but slug is not explicitly set
      data.slug = await this.resolveUniqueSlug(dto.title, id);
    }
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt?.trim();
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.coverUrl !== undefined) data.coverUrl = dto.coverUrl;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.status !== undefined) data.status = dto.status;

    return this.prisma.article.update({ where: { id }, data });
  }

  async publish(id: string) {
    const article = await this.findOne(id);
    if (article.status === PublishStatus.PUBLISHED) {
      throw new BadRequestException('Article is already published');
    }
    return this.prisma.article.update({
      where: { id },
      data: { status: PublishStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async unpublish(id: string) {
    const article = await this.findOne(id);
    if (article.status === PublishStatus.DRAFT) {
      throw new BadRequestException('Article is already a draft');
    }
    return this.prisma.article.update({
      where: { id },
      data: { status: PublishStatus.DRAFT },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.article.delete({ where: { id } });
  }

  // ─── Public ───────────────────────────────────────────────────────────────

  async findPublished(query: ListArticlesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.ArticleWhereInput = {
      status: PublishStatus.PUBLISHED,
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

  async findBySlug(slug: string) {
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
        publishedAt: true,
        author: { select: { displayName: true } },
      },
    });

    if (!article || article.publishedAt === null) {
      throw new NotFoundException('Article not found');
    }

    return article;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async resolveUniqueSlug(
    base: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = slugify(base);
    let candidate = baseSlug;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.article.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing || existing.id === excludeId) return candidate;

      candidate = `${baseSlug}-${counter++}`;
    }
  }
}
