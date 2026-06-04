import { PublishStatus } from '@prisma/client';
export declare class CreateArticleDto {
    title: string;
    slug?: string;
    excerpt?: string;
    content: string;
    coverUrl?: string;
    tags?: string[];
    status?: PublishStatus;
    cover?: any;
}
