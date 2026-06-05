import type { v2 as CloudinaryType } from 'cloudinary';
export declare class MediaService {
    private readonly cloudinary;
    constructor(cloudinary: typeof CloudinaryType);
    uploadBuffer(buffer: Buffer, opts?: {
        folder?: string;
        filename?: string;
    }): Promise<{
        publicId: string;
        secureUrl: string;
    }>;
}
