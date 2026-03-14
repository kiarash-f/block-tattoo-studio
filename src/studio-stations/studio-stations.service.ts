import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudioStationDto } from './dto/create-studio-station.dto';
import { UpdateStudioStationDto } from './dto/update-studio-station.dto';
import { ListStudioStationsDto } from './dto/list-studio-stations.dto';

@Injectable()
export class StudioStationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudioStationDto) {
    const name = dto.name.trim();
    const code = dto.code?.trim();

    await this.assertUniqueName(name);
    if (code) await this.assertUniqueCode(code);

    return this.prisma.studioStation.create({
      data: {
        name,
        code,
        status: dto.status ?? StationStatus.ACTIVE,
        // studioId: null for now
      },
    });
  }

  async findOne(id: string) {
    const station = await this.prisma.studioStation.findUnique({
      where: { id },
    });
    if (!station) throw new NotFoundException('Studio station not found');
    return station;
  }

  async list(query: ListStudioStationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const q = query.q?.trim();
    const where: Prisma.StudioStationWhereInput = {
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

  async update(id: string, dto: UpdateStudioStationDto) {
    await this.findOne(id);

    const name = dto.name?.trim();
    if (name) await this.assertUniqueName(name, id);

    const code = dto.code?.trim();
    if (code) await this.assertUniqueCode(code, id);

    return this.prisma.studioStation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code?.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.studioStation.update({
      where: { id },
      data: { status: StationStatus.INACTIVE },
    });
  }

  private async assertUniqueName(name: string, excludeId?: string) {
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

    if (existing) throw new BadRequestException('Station name already exists');
  }

  private async assertUniqueCode(code: string, excludeId?: string) {
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

    if (existing) throw new BadRequestException('Station code already exists');
  }
}
