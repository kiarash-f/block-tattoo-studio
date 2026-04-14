import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, UploadKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';

@Injectable()
export class BookingLinksUploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async uploadForBookingViaToken(params: {
    bookingRequestId: string;
    tokenId: string;
    kind: UploadKind;
    note?: string;
    files: Express.Multer.File[];
  }) {
    const booking = await this.prisma.bookingRequest.findUnique({
      where: { id: params.bookingRequestId },
      select: { id: true, status: true },
    });

    if (!booking) throw new NotFoundException('BookingRequest not found');

    // ✅ Allow uploads while intake is open / review in progress.
    // Tune as you want. This matches your status enum.
    const ALLOWED_UPLOAD_STATUSES = new Set<BookingStatus>([
      'PENDING_CONSULT',
      'CONSULT_APPROVED',
      'TATTOO_SCHEDULED',
    ]);

    if (!ALLOWED_UPLOAD_STATUSES.has(booking.status)) {
      throw new BadRequestException(
        `Uploads are not allowed at current status (${booking.status})`,
      );
    }

    // Upload to Cloudinary
    const uploaded = await Promise.all(
      params.files.map((file) =>
        this.media.uploadBuffer(file.buffer, {
          folder: `tattoo/booking/${booking.id}`,
          filename: file.originalname,
        }),
      ),
    );

    // Persist uploads in DB
    const created = await this.prisma.$transaction(
      uploaded.map((u, idx) => {
        const f = params.files[idx];
        return this.prisma.upload.create({
          data: {
            bookingRequestId: booking.id,
            kind: params.kind,
            originalName: f.originalname,
            mimeType: f.mimetype,
            bytes: f.size,
            cloudinaryPublicId: u.publicId,
            secureUrl: u.secureUrl,
            createdViaTokenId: params.tokenId,
          },
          select: {
            id: true,
            kind: true,
            secureUrl: true,
            createdAt: true,
            originalName: true,
            mimeType: true,
            bytes: true,
          },
        });
      }),
    );

    return {
      inserted: created.length,
      note: params.note ?? null,
      uploads: created,
    };
  }
}
