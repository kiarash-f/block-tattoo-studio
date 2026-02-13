import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import {
  CreateBookingIntakeDto,
  BudgetRange as DtoBudgetRange,
} from './dto/booking-intake.dto';
import {
  BudgetRange as PrismaBudgetRange,
  UploadKind,
  IntakeSource,
} from '@prisma/client';

function mapBudgetRangeToPrisma(v: DtoBudgetRange): PrismaBudgetRange {
  switch (v) {
    case DtoBudgetRange.UNDER_200:
      return PrismaBudgetRange.UNDER_200;
    case DtoBudgetRange._200_400:
      return PrismaBudgetRange.B200_400;
    case DtoBudgetRange._400_700:
      return PrismaBudgetRange.B400_700;
    case DtoBudgetRange._700_1000:
      return PrismaBudgetRange.B700_1000;
    case DtoBudgetRange._1000_1500:
      return PrismaBudgetRange.B1000_1500;
    case DtoBudgetRange._1500_2000:
      return PrismaBudgetRange.B1500_2000;
    case DtoBudgetRange.OVER_2000:
      return PrismaBudgetRange.OVER_2000;
    default:
      throw new Error(`Unsupported budgetRange: ${v as string}`);
  }
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async createBookingIntake(
    dto: CreateBookingIntakeDto,
    files: Express.Multer.File[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      const { client, bookingRequest, medicalDeclaration, consent } = dto;

      // 1) Find existing client by email, else phone
      let existing: {
        id: string;
        instagram: string | null;
        birthday: Date | null;
      } | null = null;

      if (client.email) {
        existing = await tx.client.findFirst({
          where: { email: client.email },
          select: { id: true, instagram: true, birthday: true },
        });
      }

      if (!existing && client.phone) {
        existing = await tx.client.findFirst({
          where: { phone: client.phone },
          select: { id: true, instagram: true, birthday: true },
        });
      }

      const clientRow = existing
        ? await tx.client.update({
            where: { id: existing.id },
            data: {
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email ?? undefined,
              phone: client.phone ?? undefined,
              instagram: client.instagram ?? existing.instagram ?? undefined,
              birthday: client.birthday
                ? new Date(client.birthday)
                : (existing.birthday ?? undefined),
            },
          })
        : await tx.client.create({
            data: {
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email ?? undefined,
              phone: client.phone ?? undefined,
              instagram: client.instagram ?? undefined,
              birthday: client.birthday ? new Date(client.birthday) : undefined,
            },
          });

      const preferredArtistName =
        bookingRequest.preferredArtistName?.trim() || undefined;

      // 2) Booking request
      const studioChooses = preferredArtistName
        ? (bookingRequest.studioChooses ?? false)
        : true;

      const source: IntakeSource =
        (bookingRequest.source as IntakeSource) ?? IntakeSource.DIRECT;

      const br = await tx.bookingRequest.create({
        data: {
          clientId: clientRow.id,

          description: bookingRequest.description,
          budgetRange: mapBudgetRangeToPrisma(bookingRequest.budgetRange),

          placement: bookingRequest.placement ?? undefined,
          sizeDescription: bookingRequest.sizeDescription ?? undefined,
          styleNotes: bookingRequest.styleNotes ?? undefined,
          referencesNotes: bookingRequest.referencesNotes ?? undefined,

          preferredArtistName,
          studioChooses,

          source,
          utmCampaign: bookingRequest.utmCampaign ?? undefined,
          utmAdset: bookingRequest.utmAdset ?? undefined,
          utmAd: bookingRequest.utmAd ?? undefined,
          referrer: bookingRequest.referrer ?? undefined,
          landingPath: bookingRequest.landingPath ?? undefined,

          medicalDeclaration: {
            create: {
              ...medicalDeclaration,
              allergiesDetails:
                medicalDeclaration.allergiesDetails ?? undefined,
              skinConditionDetails:
                medicalDeclaration.skinConditionDetails ?? undefined,
              medicationDetails:
                medicalDeclaration.medicationDetails ?? undefined,
              otherNotes: medicalDeclaration.otherNotes ?? undefined,
            },
          },

          consent: {
            create: {
              ...consent,
              fullName: consent.fullName ?? undefined,
              signedAt: consent.signedAt
                ? new Date(consent.signedAt)
                : undefined,
            },
          },
        },
      });

      // 3) Uploads
      if (files?.length) {
        for (const f of files) {
          if (!f?.buffer) continue; // should exist due to memoryStorage()

          const uploaded = await this.media.uploadBuffer(f.buffer, {
            folder: 'tattoo-studio/booking-requests',
            filename: f.originalname,
          });

          await tx.upload.create({
            data: {
              bookingRequestId: br.id,
              kind: UploadKind.REFERENCE,
              originalName: f.originalname ?? undefined,
              mimeType: f.mimetype ?? undefined,
              bytes: typeof f.size === 'number' ? f.size : undefined,
              cloudinaryPublicId: uploaded.publicId,
              secureUrl: uploaded.secureUrl,
            },
          });
        }
      }

      return {
        bookingRequestId: br.id,
        status: br.status,
        createdAt: br.createdAt,
      };
    });
  }
}
