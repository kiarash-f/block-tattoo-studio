import { WorkCardResponse } from './work-card.response';
declare class ArtistPublicResponse {
    id: string;
    slug: string | null;
    handle: string | null;
    displayName: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    bio: string | null;
}
declare class WorksPagedResponse {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    items: WorkCardResponse[];
}
export declare class ArtistPageResponse {
    artist: ArtistPublicResponse;
    works: WorksPagedResponse;
}
export {};
