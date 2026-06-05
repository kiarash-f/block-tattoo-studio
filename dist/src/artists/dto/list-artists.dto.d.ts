import { ArtistStatus } from '@prisma/client';
export declare class ListArtistsDto {
    status?: ArtistStatus;
    q?: string;
    page?: number;
    limit?: number;
}
