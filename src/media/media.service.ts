import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CLOUDINARY } from './cloudinary.provider';
import type { v2 as CloudinaryType } from 'cloudinary';

@Injectable()
export class MediaService {
  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: typeof CloudinaryType,
  ) {}

  async uploadBuffer(
    buffer: Buffer,
    opts?: { folder?: string; filename?: string },
  ): Promise<{ publicId: string; secureUrl: string }> {
    if (!buffer?.length) throw new BadRequestException('Empty file buffer');

    const folder = opts?.folder ?? process.env.CLOUDINARY_FOLDER ?? undefined;

    try {
      const res = await new Promise<{
        public_id: string;
        secure_url: string;
      }>((resolve, reject) => {
        const stream = this.cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            // optional: keep original filename-ish
            use_filename: true,
            unique_filename: true,
            filename_override: opts?.filename,
          },
          (error, result) => {
            if (error) return reject(error);
            if (!result?.public_id || !result?.secure_url) {
              return reject(new Error('Invalid Cloudinary response'));
            }
            resolve({
              public_id: result.public_id,
              secure_url: result.secure_url,
            });
          },
        );

        stream.end(buffer);
      });

      return { publicId: res.public_id, secureUrl: res.secure_url };
    } catch (e: any) {
      // Cloudinary errors should be 400-ish for client-caused issues, otherwise 500
      // Keep it simple for Phase 1: return 400 with a safe message
      throw new BadRequestException(
        e?.message ? `Upload failed: ${e.message}` : 'Upload failed',
      );
    }
  }
}
