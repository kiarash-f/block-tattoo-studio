import { LookbookArtistCardResponse } from './lookbook-artist-card.response';
export declare class LookbookResponse {
    page: number;
    limit: number;
    total: number;
    items: LookbookArtistCardResponse[];
}
