import { WorkCardResponse } from './work-card.response';
export declare class LookbookArtistCardResponse {
    id: string;
    slug: string | null;
    displayName: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    worksCount: number;
    latestWorks: WorkCardResponse[];
}
