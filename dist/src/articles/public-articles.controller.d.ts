import { ArticlesService } from './articles.service';
import { ListArticlesDto } from './dto/list-articles.dto';
export declare class PublicArticlesController {
    private readonly service;
    constructor(service: ArticlesService);
    findAll(query: ListArticlesDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: {
            id: string;
            tags: string[];
            title: string;
            slug: string;
            coverUrl: string | null;
            publishedAt: Date | null;
            excerpt: string | null;
        }[];
    }>;
    findBySlug(slug: string): Promise<{
        id: string;
        tags: string[];
        content: string;
        title: string;
        status: import("@prisma/client").$Enums.PublishStatus;
        slug: string;
        coverUrl: string | null;
        publishedAt: Date | null;
        excerpt: string | null;
        author: {
            displayName: string | null;
        } | null;
    }>;
}
