import { PublishStatus } from '@prisma/client';
export declare class UpdateWorkDto {
    title?: string;
    tags?: string[];
    status?: PublishStatus;
}
