import { StationStatus } from '@prisma/client';
export declare class ListStudioStationsDto {
    status?: StationStatus;
    q?: string;
    page?: number;
    limit?: number;
}
