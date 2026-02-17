import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ArtistStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { ListArtistsDto } from './dto/list-artists.dto';

@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateArtistDto) {
    const data: Prisma.ArtistCreateInput = {
      displayName: dto.displayName.trim(),
      handle: dto.handle?.trim(),
      email: dto.email?.trim()?.toLowerCase(),
      phone: dto.phone?.trim(),
      status: dto.status ?? ArtistStatus.ACTIVE,
      bio: dto.bio,
      avatarUrl: dto.avatarUrl,
    };
    // await this.assertUniqueFields(data.handle, data.email);
    return this.prisma.artist.create({ data });
  }

  async findOne(id: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id } });
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
      }),
      this.prisma.artist.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      items,
    };
  }

  async update(id: string, dto: UpdateArtistDto) {
    // Ensure exists (and gives clean 404)
    await this.findOne(id);

    const data: Prisma.ArtistUpdateInput = {
      ...(dto.displayName !== undefined
        ? { displayName: dto.displayName.trim() }
        : {}),
      ...(dto.handle !== undefined ? { handle: dto.handle?.trim() } : {}),
      ...(dto.email !== undefined
        ? { email: dto.email?.trim()?.toLowerCase() }
        : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
      ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
    };

    // Optional nicer pre-checks for unique fields if they are being changed
    const handle = typeof data.handle === 'string' ? data.handle : undefined;
    const email = typeof data.email === 'string' ? data.email : undefined;
    await this.assertUniqueFields(handle, email, id);

    return this.prisma.artist.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string) {
    // prefer “soft delete”
    await this.findOne(id);
    return this.prisma.artist.update({
      where: { id },
      data: { status: ArtistStatus.INACTIVE },
    });
  }

  private async assertUniqueFields(
    handle?: string,
    email?: string,
    excludeId?: string,
  ) {
    if (!handle && !email) return;

    const conflicts = await this.prisma.artist.findFirst({
      where: {
        AND: [
          excludeId ? { id: { not: excludeId } } : {},
          {
            OR: [
              ...(handle ? [{ handle }] : []),
              ...(email ? [{ email }] : []),
            ],
          },
        ],
      },
      select: { id: true, handle: true, email: true },
    });

    if (conflicts) {
      // Keep message simple; PrismaExceptionFilter will still catch hard unique errors
      throw new BadRequestException('handle or email already in use');
    }
  }
}
