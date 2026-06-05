import { StationConfigService } from './station-config.service';
import { UpdateStationConfigDto } from './dto/update-station-config.dto';
export declare class StationConfigController {
    private readonly service;
    constructor(service: StationConfigService);
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
