import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { EmailService } from '../email/email.service';
import {
  CreateBookingIntakeDto,
  BudgetRange as DtoBudgetRange,
  BookingType as DtoBookingType,
  PreferredTimeOfDay as DtoPreferredTimeOfDay,
} from './dto/booking-intake.dto';
import {
  BudgetRange as PrismaBudgetRange,
  UploadKind,
  IntakeSource,
  PreferredTimeOfDay as PrismaPreferredTimeOfDay,
  BookingType as PrismaBookingType,
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
      throw new BadRequestException(`Unsupported budgetRange: ${v as string}`);
  }
}

function mapBookingTypeToPrisma(
  v?: DtoBookingType,
): PrismaBookingType | undefined {
  if (!v) return undefined;
  switch (v) {
    case DtoBookingType.APPOINTMENT:
      return PrismaBookingType.APPOINTMENT;
    case DtoBookingType.CONSULTATION:
      return PrismaBookingType.CONSULTATION;
    case DtoBookingType.COVER_UP:
      return PrismaBookingType.COVER_UP;
    case DtoBookingType.WALK_IN:
      return PrismaBookingType.WALK_IN;
    default:
      throw new BadRequestException(`Unsupported bookingType: ${v as string}`);
  }
}

function mapPreferredTimeOfDayToPrisma(
  v?: DtoPreferredTimeOfDay,
): PrismaPreferredTimeOfDay | undefined {
  if (!v) return undefined;
  switch (v) {
    case DtoPreferredTimeOfDay.MORNING:
      return PrismaPreferredTimeOfDay.MORNING;
    case DtoPreferredTimeOfDay.AFTERNOON:
      return PrismaPreferredTimeOfDay.AFTERNOON;
    case DtoPreferredTimeOfDay.EVENING:
      return PrismaPreferredTimeOfDay.EVENING;
    case DtoPreferredTimeOfDay.ANY:
      return PrismaPreferredTimeOfDay.ANY;
    default:
      throw new BadRequestException(
        `Unsupported preferredTimeOfDay: ${v as string}`,
      );
  }
}

function parseOptionalDate(name: string, value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid ${name}`);
  }
  return d;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Public intake:
   * - Creates/updates Client
   * - Creates BookingRequest
   * - ✅ medicalDeclaration + consent are OPTIONAL now (filled later in-studio)
   * - Optionally uploads REFERENCE images (files[])
   */
  async createBookingIntake(
    dto: CreateBookingIntakeDto,
    files: Express.Multer.File[],
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const { client, bookingRequest } = dto;
      const medicalDeclaration = dto.medicalDeclaration;
      const consent = dto.consent;

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

      // Upsert-ish behavior for client
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

      // 2) Normalize & validate booking request fields
      const preferredArtistName =
        bookingRequest.preferredArtistName?.trim() || undefined;

      const preferredDateFrom = parseOptionalDate(
        'preferredDateFrom',
        bookingRequest.preferredDateFrom,
      );
      const preferredDateTo = parseOptionalDate(
        'preferredDateTo',
        bookingRequest.preferredDateTo,
      );

      if (
        preferredDateFrom &&
        preferredDateTo &&
        preferredDateTo < preferredDateFrom
      ) {
        throw new BadRequestException(
          'preferredDateTo must be after preferredDateFrom',
        );
      }

      // If client picked an artist, studioChooses can be false; otherwise default true
      const studioChooses = preferredArtistName
        ? (bookingRequest.studioChooses ?? false)
        : true;

      const source: IntakeSource =
        (bookingRequest.source as IntakeSource) ?? IntakeSource.DIRECT;

      // 3) Build Prisma create data
      // ✅ medicalDeclaration/consent are conditional (optional)
      const brCreateData: any = {
        clientId: clientRow.id,

        preferredDateFrom: preferredDateFrom ?? undefined,
        preferredDateTo: preferredDateTo ?? undefined,
        preferredTimeOfDay: mapPreferredTimeOfDayToPrisma(
          bookingRequest.preferredTimeOfDay,
        ),
        preferredDaysNote: bookingRequest.preferredDaysNote ?? undefined,

        description: bookingRequest.description,
        budgetRange: mapBudgetRangeToPrisma(bookingRequest.budgetRange),
        bookingType: mapBookingTypeToPrisma(bookingRequest.bookingType),

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
      };

      if (medicalDeclaration) {
        brCreateData.medicalDeclaration = {
          create: {
            hasAllergies: medicalDeclaration.hasAllergies,
            allergiesDetails: medicalDeclaration.allergiesDetails ?? undefined,
            hasSkinCondition: medicalDeclaration.hasSkinCondition,
            skinConditionDetails:
              medicalDeclaration.skinConditionDetails ?? undefined,
            isPregnantOrNursing: medicalDeclaration.isPregnantOrNursing,
            hasHeartCondition: medicalDeclaration.hasHeartCondition,
            hasDiabetes: medicalDeclaration.hasDiabetes,
            takesBloodThinners: medicalDeclaration.takesBloodThinners,
            takesMedication: medicalDeclaration.takesMedication,
            medicationDetails:
              medicalDeclaration.medicationDetails ?? undefined,
            otherNotes: medicalDeclaration.otherNotes ?? undefined,
          },
        };
      }

      if (consent) {
        brCreateData.consent = {
          create: {
            isAdultConfirmed: consent.isAdultConfirmed,
            termsAccepted: consent.termsAccepted,
            privacyAccepted: consent.privacyAccepted,
            fullName: consent.fullName ?? undefined,
            signedAt: consent.signedAt ? new Date(consent.signedAt) : undefined,
          },
        };
      }

      // 4) Create booking request
      const br = await tx.bookingRequest.create({
        data: brCreateData,
      });

      // 5) Uploads (optional)
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
        clientEmail: clientRow.email ?? null,
        clientName: `${clientRow.firstName} ${clientRow.lastName}`.trim(),
      };
    });

    if (result.clientEmail) {
      this.email
        .sendBookingConfirmation({
          to: result.clientEmail,
          clientName: result.clientName,
          bookingRequestId: result.bookingRequestId,
        })
        .catch(() => void 0);
    }

    return {
      bookingRequestId: result.bookingRequestId,
      status: result.status,
      createdAt: result.createdAt,
    };
  }
}
