import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { CLOUDINARY, createCloudinaryClient } from './cloudinary.provider';

@Module({
  providers: [
    MediaService,
    {
      provide: CLOUDINARY,
      useFactory: () => createCloudinaryClient(),
    },
  ],
  exports: [MediaService],
})
export class MediaModule {}
