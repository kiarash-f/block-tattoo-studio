import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStationConfigDto } from './dto/update-station-config.dto';

@Injectable()
export class StationConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    // There is only ever one StationConfig row
    const config = await this.prisma.stationConfig.findFirst();
    if (!config)
      throw new NotFoundException(
        'Station config not set up yet. Use PATCH to create it.',
      );
    return config;
  }

  async upsert(dto: UpdateStationConfigDto) {
    const existing = await this.prisma.stationConfig.findFirst();

    if (existing) {
      return this.prisma.stationConfig.update({
        where: { id: existing.id },
        data: {
          ...(dto.totalTables !== undefined
            ? { totalTables: dto.totalTables }
            : {}),
          ...(dto.pricePerDayCents !== undefined
            ? { pricePerDayCents: dto.pricePerDayCents }
            : {}),
          ...(dto.monthlyDiscountPercent !== undefined
            ? { monthlyDiscountPercent: dto.monthlyDiscountPercent }
            : {}),
        },
      });
    }

    // First-time setup — all fields required
    return this.prisma.stationConfig.create({
      data: {
        totalTables: dto.totalTables ?? 5,
        pricePerDayCents: dto.pricePerDayCents ?? 0,
        monthlyDiscountPercent: dto.monthlyDiscountPercent ?? 10,
      },
    });
  }
}
