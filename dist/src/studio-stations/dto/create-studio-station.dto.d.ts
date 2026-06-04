import { StationStatus } from '@prisma/client';
export declare class CreateStudioStationDto {
    name: string;
    code?: string;
    status?: StationStatus;
}
