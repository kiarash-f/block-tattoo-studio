import { PublishStatus } from '@prisma/client';
export declare class ListArticlesDto {
    page?: number;
    limit?: number;
    q?: string;
    status?: PublishStatus;
    tag?: string;
}
