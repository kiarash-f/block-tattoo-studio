import { StudioStationsService } from './studio-stations.service';
import { CreateStudioStationDto } from './dto/create-studio-station.dto';
import { UpdateStudioStationDto } from './dto/update-studio-station.dto';
import { ListStudioStationsDto } from './dto/list-studio-stations.dto';
export declare class StudioStationsController {
    private readonly stations;
    constructor(stations: StudioStationsService);
    create(dto: CreateStudioStationDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.StationStatus;
        studioId: string | null;
        code: string | null;
    }>;
    list(query: ListStudioStationsDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            status: import("@prisma/client").$Enums.StationStatus;
            studioId: string | null;
            code: string | null;
        }[];
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.StationStatus;
        studioId: string | null;
        code: string | null;
    }>;
    update(id: string, dto: UpdateStudioStationDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.StationStatus;
        studioId: string | null;
        code: string | null;
    }>;
    deactivate(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.StationStatus;
        studioId: string | null;
        code: string | null;
    }>;
}
