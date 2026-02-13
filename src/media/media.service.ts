import { Injectable } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

@Injectable()
export class MediaService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
      api_key: process.env.CLOUDINARY_API_KEY!,
      api_secret: process.env.CLOUDINARY_API_SECRET!,
    });
  }

  async uploadBuffer(buffer: Buffer, opts: { folder: string; filename?: string }) {
    return new Promise<{ publicId: string; secureUrl: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: opts.folder, resource_type: "image", filename_override: opts.filename, use_filename: true, unique_filename: true },
        (err, res) => {
          if (err || !res) return reject(err);
          resolve({ publicId: res.public_id, secureUrl: res.secure_url });
        },
      );
      stream.end(buffer);
    });
  }
}