import { ArtistStatus } from '@prisma/client';
export declare class CreateArtistDto {
    displayName: string;
    handle?: string;
    email?: string;
    phone?: string;
    status?: ArtistStatus;
    bio?: string;
    avatarUrl?: string;
    slug?: string;
}
