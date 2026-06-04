import { PrismaService } from '../../prisma/prisma.service';
import { LookbookQueryDto } from './dto/lookbook.query.dto';
import { ArtistPageQueryDto } from './dto/artist-page.query.dto';
export declare class PublicArtistsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    lookbook(query: LookbookQueryDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: {
            id: string;
            slug: string | null;
            handle: string | null;
            displayName: string;
            avatarUrl: string | null;
            coverUrl: string | null;
            worksCount: number;
            latestWorks: {
                id: string;
                title: string;
                coverUrl: string;
                tags: string[];
                createdAt: string;
            }[];
        }[];
    }>;
    artistPageBySlug(slug: string, query: ArtistPageQueryDto): Promise<{
        artist: {
            id: string;
            displayName: string;
            handle: string | null;
            slug: string | null;
            bio: string | null;
            avatarUrl: string | null;
            coverUrl: string | null;
        };
        works: {
            page: number;
            limit: number;
            total: number;
            hasMore: boolean;
            items: {
                id: string;
                title: string;
                coverUrl: string;
                tags: string[];
                createdAt: string;
            }[];
        };
    }>;
}
