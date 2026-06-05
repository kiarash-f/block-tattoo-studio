import { ArtistsService } from './artists.service';
import { ListArtistsDto } from './dto/list-artists.dto';
import { AdminCreateArtistMultipartDto } from './dto/admin-create-artist.multipart.dto';
import { AdminUpdateArtistMultipartDto } from './dto/admin-update-artist.multipart.dto';
export declare class ArtistsController {
    private readonly artists;
    constructor(artists: ArtistsService);
    create(files: {
        cover?: Express.Multer.File[];
        works?: Express.Multer.File[];
    }, dto: AdminCreateArtistMultipartDto): Promise<{
        id: string;
        email: string | null;
        displayName: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ArtistStatus;
        phone: string | null;
        handle: string | null;
        slug: string | null;
        studioId: string | null;
        bio: string | null;
        bioDe: string | null;
        bioEn: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
    }>;
    list(query: ListArtistsDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: ({
            works: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tags: string[];
                title: string;
                status: import("@prisma/client").$Enums.PublishStatus;
                artistId: string;
                coverUrl: string;
                titleDe: string | null;
                titleEn: string | null;
                publishedAt: Date | null;
            }[];
        } & {
            id: string;
            email: string | null;
            displayName: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ArtistStatus;
            phone: string | null;
            handle: string | null;
            slug: string | null;
            studioId: string | null;
            bio: string | null;
            bioDe: string | null;
            bioEn: string | null;
            avatarUrl: string | null;
            coverUrl: string | null;
        })[];
    }>;
    findOne(id: string): Promise<{
        works: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tags: string[];
            title: string;
            status: import("@prisma/client").$Enums.PublishStatus;
            artistId: string;
            coverUrl: string;
            titleDe: string | null;
            titleEn: string | null;
            publishedAt: Date | null;
        }[];
    } & {
        id: string;
        email: string | null;
        displayName: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ArtistStatus;
        phone: string | null;
        handle: string | null;
        slug: string | null;
        studioId: string | null;
        bio: string | null;
        bioDe: string | null;
        bioEn: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
    }>;
    update(id: string, files: {
        cover?: Express.Multer.File[];
        works?: Express.Multer.File[];
    }, dto: AdminUpdateArtistMultipartDto): Promise<{
        id: string;
        email: string | null;
        displayName: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ArtistStatus;
        phone: string | null;
        handle: string | null;
        slug: string | null;
        studioId: string | null;
        bio: string | null;
        bioDe: string | null;
        bioEn: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
    }>;
    deactivate(id: string): Promise<{
        id: string;
        email: string | null;
        displayName: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ArtistStatus;
        phone: string | null;
        handle: string | null;
        slug: string | null;
        studioId: string | null;
        bio: string | null;
        bioDe: string | null;
        bioEn: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
    }>;
}
