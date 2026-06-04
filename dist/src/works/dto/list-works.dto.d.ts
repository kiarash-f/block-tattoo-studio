import { PublishStatus } from '@prisma/client';
export declare class ListWorksDto {
    status?: PublishStatus;
    page?: number;
    limit?: number;
}
