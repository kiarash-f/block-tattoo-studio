import { WorksService } from './works.service';
import { UpdateWorkDto } from './dto/update-work.dto';
import { ListWorksDto } from './dto/list-works.dto';
export declare class WorksController {
    private readonly works;
    constructor(works: WorksService);
    list(artistId: string, query: ListWorksDto): Promise<{
        page: number;
        limit: number;
        total: number;
        items: {
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
    }>;
    update(artistId: string, workId: string, dto: UpdateWorkDto): Promise<{
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
    }>;
    remove(artistId: string, workId: string): Promise<{
        deleted: boolean;
    }>;
}
