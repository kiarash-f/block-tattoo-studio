import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { reportEmailFailure } from '../common/report-email-failure';
import {
  STUDIO_TIMEZONE,
  getZonedYmd,
  dayOfWeekForYmd,
} from '../common/time/zoned-date-range';
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

export function mapBudgetRangeToPrisma(v: DtoBudgetRange): PrismaBudgetRange {
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

  async createBookingIntake(
    dto: CreateBookingIntakeDto,
    files: Express.Multer.File[],
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const { client, bookingRequest } = dto;

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

      // Validate and parse consultDate
      const consultDateRaw = bookingRequest.consultDate;
      const consultDate = new Date(consultDateRaw);
      if (Number.isNaN(consultDate.getTime())) {
        throw new BadRequestException('Invalid consultDate');
      }
      // Past-date + Sunday checks on the Berlin calendar day, so the boundary
      // matches analytics and the payments list rather than the server's local
      // day (M6). Comparing YYYY-MM-DD strings is a safe calendar comparison.
      const consultYmd = getZonedYmd(consultDate, STUDIO_TIMEZONE);
      const todayYmd = getZonedYmd(new Date(), STUDIO_TIMEZONE);
      if (consultYmd < todayYmd) {
        throw new BadRequestException('consultDate cannot be in the past');
      }
      // Sundays are closed (0 = Sunday)
      if (dayOfWeekForYmd(consultYmd) === 0) {
        throw new BadRequestException('Studio is closed on Sundays');
      }

      // Upsert ConsultSlot for the chosen date
      const consultSlot = await tx.consultSlot.upsert({
        where: { date: consultDate },
        create: { date: consultDate, maxCount: 3 },
        update: {},
      });

      // If client picked an artist, studioChooses can be false; otherwise default true
      const studioChooses = preferredArtistName
        ? (bookingRequest.studioChooses ?? false)
        : true;

      const source: IntakeSource =
        (bookingRequest.source as IntakeSource) ?? IntakeSource.DIRECT;

      // 3) Create booking request with PENDING_CONSULT status
      const br = await tx.bookingRequest.create({
        data: {
          clientId: clientRow.id,
          status: 'PENDING_CONSULT',
          consultDate,
          consultSlotId: consultSlot.id,

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
        },
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
        .catch(
          reportEmailFailure('intake booking confirmation email', {
            bookingRequestId: result.bookingRequestId,
          }),
        );
    }

    return {
      bookingRequestId: result.bookingRequestId,
      status: result.status,
      createdAt: result.createdAt,
    };
  }

  async getMonthAvailability(month: string) {
    // Validate format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }

    const [year, mon] = month.split('-').map(Number);
    const firstDay = new Date(year, mon - 1, 1);
    const lastDay = new Date(year, mon, 0); // last day of month

    // Fetch all ConsultSlots in this month with booking counts
    const slots = await this.prisma.consultSlot.findMany({
      where: {
        date: { gte: firstDay, lte: lastDay },
      },
      include: {
        _count: {
          select: {
            bookings: {
              where: {
                status: { in: ['PENDING_CONSULT', 'CONSULT_APPROVED'] },
              },
            },
          },
        },
      },
    });

    const slotMap = new Map<string, number>();
    for (const s of slots) {
      const key = s.date.toISOString().slice(0, 10);
      slotMap.set(key, s._count.bookings);
    }

    const SOFT_LIMIT = 3;
    const days: {
      date: string;
      status: 'closed' | 'open' | 'busy';
      count: number;
    }[] = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isSunday = d.getDay() === 0;
      const count = slotMap.get(dateStr) ?? 0;

      days.push({
        date: dateStr,
        status: isSunday ? 'closed' : count >= SOFT_LIMIT ? 'busy' : 'open',
        count,
      });
    }

    return { month, days };
  }
}
