import { PrismaService } from '../prisma/prisma.service';
import { UpdateStationConfigDto } from './dto/update-station-config.dto';
export declare class StationConfigService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    get(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        totalTables: number;
        pricePerDay: number;
        monthlyDiscountPercent: number;
    }>;
    upsert(dto: UpdateStationConfigDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        totalTables: number;
        pricePerDay: number;
        monthlyDiscountPercent: number;
    }>;
}
