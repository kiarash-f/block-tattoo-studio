import { UploadKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
export declare class BookingLinksUploadsService {
    private readonly prisma;
    private readonly media;
    constructor(prisma: PrismaService, media: MediaService);
    uploadForBookingViaToken(params: {
        bookingRequestId: string;
        tokenId: string;
        kind: UploadKind;
        note?: string;
        files: Express.Multer.File[];
    }): Promise<{
        inserted: number;
        note: string | null;
        uploads: {
            id: string;
            createdAt: Date;
            secureUrl: string;
            kind: import("@prisma/client").$Enums.UploadKind;
            originalName: string | null;
            mimeType: string | null;
            bytes: number | null;
        }[];
    }>;
}
