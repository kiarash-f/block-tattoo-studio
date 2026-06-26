import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  AssignmentRole,
  BookingStatus,
  BookingType,
  BudgetRange,
  CancelReason,
  Prisma,
  UploadKind,
} from '@prisma/client';
import { MediaService } from '../media/media.service';
import { PaymentsService } from '../payments/payments.service';
import { SessionWindowService } from '../scheduling/session-window.service';
import { PublicUpdateIntakeDto } from '../booking-links/dto/public-update-intake.dto';
import { getUtcRangeForZonedDate, getUtcRangeForPeriod, Period } from '../common/time/zoned-date-range';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_CONSULT: ['CONSULT_APPROVED', 'CANCELLED'],
  CONSULT_APPROVED: ['CONSULT_NO_SHOW', 'CANCELLED'],
  // TATTOO_SCHEDULED is set via scheduleTattooSession, not updateStatus
  CONSULT_NO_SHOW: [],
  TATTOO_SCHEDULED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const REVIEWED_STATUSES: BookingStatus[] = ['CONSULT_APPROVED'];

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly media: MediaService,
    private readonly payments: PaymentsService,
    private readonly sessionWindow: SessionWindowService,
  ) {}

  async list(params: {
    status?: BookingStatus;
    q?: string;
    page: number;
    limit: number;
  }) {
    const { status, q, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingRequestWhereInput = {};
    if (status) where.status = status;

    if (q?.trim()) {
      const term = q.trim();
      where.client = {
        is: {
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { phone: { contains: term, mode: 'insensitive' } },
          ],
        },
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.bookingRequest.count({ where }),
      this.prisma.bookingRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          client: true,
          tattooSessions: {
            orderBy: { scheduledDate: 'asc' },
            take: 1,
            select: { scheduledDate: true, artistId: true, artist: { select: { id: true, displayName: true } } },
          },
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  async detail(id: string) {
    const booking = await this.prisma.bookingRequest.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        medicalDeclaration: true,
        consent: true,
        uploads: { orderBy: { createdAt: 'desc' } },
        tattooSessions: {
          orderBy: { scheduledDate: 'asc' },
          include: { artist: { select: { id: true, displayName: true } } },
        },
        assignments: {
          include: { artist: true, station: true },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        },
        reviewedByAdmin: {
          select: { id: true, email: true, displayName: true },
        },
        // payment rows for this booking (list for display)
        payments: {
          orderBy: { paidAt: 'desc' },
          select: {
            id: true,
            grossCents: true,
            currency: true,
            method: true,
            source: true,
            status: true,
            paidAt: true,
            note: true,
          },
        },
      },
    });

    // Cost + payment summary — computed fresh, never stored.
    const paidCents = await this.payments.sumPaidCentsForBooking(id);
    const balance = this.payments.computeBalance(
      booking.agreedPriceCents,
      paidCents,
    );

    return {
      ...booking,
      paidCents: balance.paidCents,
      remainingCents: balance.remainingCents,
      fullyPaid: balance.fullyPaid,
    };
  }

  async updateStatus(
    id: string,
    adminId: string,
    data: {
      status: BookingStatus;
      adminNotes?: string;
      internalStatusNote?: string;
      cancelReason?: CancelReason;
    },
  ) {
    const current = await this.prisma.bookingRequest.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });

    const next = data.status;

    // TATTOO_SCHEDULED is only set via scheduleTattooSession
    if (next === BookingStatus.TATTOO_SCHEDULED) {
      throw new BadRequestException(
        'Use POST /admin/bookings/:id/schedule-tattoo to schedule the tattoo date',
      );
    }

    const allowedNext = ALLOWED_TRANSITIONS[current.status] ?? [];
    if (!allowedNext.includes(next) && current.status !== next) {
      throw new BadRequestException(
        `Invalid status transition: ${current.status} -> ${next}`,
      );
    }

    const now = new Date();

    // Prevent COMPLETED before tattoo session date
    if (next === BookingStatus.COMPLETED) {
      const session = await this.prisma.tattooSession.findFirst({
        where: { bookingRequestId: id },
        orderBy: { scheduledDate: 'asc' },
        select: { scheduledDate: true },
      });
      if (!session) {
        throw new BadRequestException(
          'Cannot complete: no tattoo session scheduled',
        );
      }
      if (session.scheduledDate > now) {
        throw new BadRequestException(
          'Cannot complete before the tattoo session date',
        );
      }
    }

    if (next === BookingStatus.CANCELLED && !data.cancelReason) {
      data.cancelReason = CancelReason.OTHER;
    }

    const eventFields: Prisma.BookingRequestUpdateInput = {};

    if (next === BookingStatus.CONSULT_APPROVED) eventFields.approvedAt = now;

    if (next === BookingStatus.CONSULT_NO_SHOW) {
      eventFields.cancelledAt = now;
      eventFields.cancelReason = CancelReason.NO_SHOW;
    }

    if (next === BookingStatus.COMPLETED) {
      eventFields.completedAt = now;
      eventFields.cancelledAt = null;
      eventFields.cancelReason = null;
    }

    if (next === BookingStatus.CANCELLED) {
      eventFields.cancelledAt = now;
      eventFields.cancelReason = data.cancelReason;
      eventFields.completedAt = null;
    }

    const shouldSetReviewed = REVIEWED_STATUSES.includes(next);

    const updated = await this.prisma.bookingRequest.update({
      where: { id },
      data: {
        status: next,
        adminNotes: data.adminNotes,
        internalStatusNote: data.internalStatusNote,
        ...eventFields,
        ...(shouldSetReviewed
          ? { reviewedAt: now, reviewedByAdmin: { connect: { id: adminId } } }
          : {}),
      },
      include: {
        client: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (next === BookingStatus.CANCELLED && updated.client.email) {
      this.email
        .sendBookingRejected({
          to: updated.client.email,
          clientName:
            `${updated.client.firstName} ${updated.client.lastName}`.trim(),
        })
        .catch(() => void 0);
    }
    return updated;
  }

  async scheduleTattooSession(
    bookingRequestId: string,
    data: {
      scheduledDate: Date;
      artistId: string;
      stationId?: string;
      startsAt: string;
      endsAt: string;
      notes?: string;
      agreedPriceCents?: number;
    },
  ) {
    const booking = await this.prisma.bookingRequest.findUniqueOrThrow({
      where: { id: bookingRequestId },
      select: {
        status: true,
        client: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (booking.status !== BookingStatus.CONSULT_APPROVED) {
      throw new BadRequestException(
        `Can only schedule tattoo from CONSULT_APPROVED status (current: ${booking.status})`,
      );
    }

    const artist = await this.prisma.artist.findUnique({
      where: { id: data.artistId },
      select: { id: true, status: true, displayName: true },
    });
    if (!artist || artist.status !== 'ACTIVE') {
      throw new BadRequestException('Artist not found or inactive');
    }

    // Validate the window + reject a per-artist same-day overlap (shared helper).
    const window = this.sessionWindow.parseWindow(data.startsAt, data.endsAt);
    await this.sessionWindow.assertNoArtistCollision({
      artistId: data.artistId,
      scheduledDate: data.scheduledDate,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    });

    const session = await this.prisma.$transaction(async (tx) => {
      const s = await tx.tattooSession.create({
        data: {
          bookingRequestId,
          artistId: data.artistId,
          stationId: data.stationId,
          scheduledDate: data.scheduledDate,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          notes: data.notes,
        },
        include: { artist: { select: { id: true, displayName: true } } },
      });

      await tx.bookingRequest.update({
        where: { id: bookingRequestId },
        data: {
          status: BookingStatus.TATTOO_SCHEDULED,
          ...(data.agreedPriceCents !== undefined
            ? { agreedPriceCents: data.agreedPriceCents }
            : {}),
        },
      });

      return s;
    });

    if (booking.client.email) {
      this.email
        .sendSessionReminder({
          to: booking.client.email,
          clientName:
            `${booking.client.firstName} ${booking.client.lastName}`.trim(),
          sessionDate: data.scheduledDate,
          artistName: artist.displayName,
        })
        .catch(() => void 0);
    }
    return session;
  }

  async createWalkIn(
    adminId: string,
    data: {
      client: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        instagram?: string;
      };
      description: string;
      budgetRange?: BudgetRange;
      tattooDate: Date;
      artistId: string;
      stationId?: string;
      startsAt: string;
      endsAt: string;
      placement?: string;
      sizeDescription?: string;
      styleNotes?: string;
      agreedPriceCents?: number;
    },
    files: Express.Multer.File[],
  ) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: data.artistId },
      select: { id: true, status: true },
    });
    if (!artist || artist.status !== 'ACTIVE') {
      throw new BadRequestException('Artist not found or inactive');
    }

    // Same shared window validation + per-artist collision check as schedule-tattoo.
    const window = this.sessionWindow.parseWindow(data.startsAt, data.endsAt);
    await this.sessionWindow.assertNoArtistCollision({
      artistId: data.artistId,
      scheduledDate: data.tattooDate,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert client
      let clientRow = data.client.email
        ? await tx.client.findFirst({ where: { email: data.client.email } })
        : null;
      if (!clientRow && data.client.phone) {
        clientRow = await tx.client.findFirst({
          where: { phone: data.client.phone },
        });
      }

      clientRow = clientRow
        ? await tx.client.update({
            where: { id: clientRow.id },
            data: {
              firstName: data.client.firstName,
              lastName: data.client.lastName,
              email: data.client.email,
              phone: data.client.phone,
              instagram: data.client.instagram,
            },
          })
        : await tx.client.create({
            data: {
              firstName: data.client.firstName,
              lastName: data.client.lastName,
              email: data.client.email,
              phone: data.client.phone,
              instagram: data.client.instagram,
            },
          });

      const booking = await tx.bookingRequest.create({
        data: {
          clientId: clientRow.id,
          status: BookingStatus.TATTOO_SCHEDULED,
          bookingType: BookingType.WALK_IN,
          description: data.description,
          budgetRange: data.budgetRange ?? BudgetRange.UNDER_200,
          placement: data.placement,
          sizeDescription: data.sizeDescription,
          styleNotes: data.styleNotes,
          studioChooses: false,
          reviewedAt: new Date(),
          reviewedByAdminId: adminId,
          approvedAt: new Date(),
          ...(data.agreedPriceCents !== undefined
            ? { agreedPriceCents: data.agreedPriceCents }
            : {}),
        },
      });

      await tx.tattooSession.create({
        data: {
          bookingRequestId: booking.id,
          artistId: data.artistId,
          stationId: data.stationId,
          scheduledDate: data.tattooDate,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        },
      });

      return { booking, client: clientRow };
    });

    // Upload reference images outside transaction
    if (files?.length) {
      for (const f of files) {
        if (!f?.buffer) continue;
        const uploaded = await this.media.uploadBuffer(f.buffer, {
          folder: 'tattoo-studio/walk-in',
          filename: f.originalname,
        });
        await this.prisma.upload.create({
          data: {
            bookingRequestId: result.booking.id,
            kind: UploadKind.REFERENCE,
            originalName: f.originalname,
            mimeType: f.mimetype,
            bytes: f.size,
            cloudinaryPublicId: uploaded.publicId,
            secureUrl: uploaded.secureUrl,
          },
        });
      }
    }

    // Generate upload token for tablet (client can add more images)
    const token = await this.generateUploadToken(result.booking.id, adminId);

    if (result.client.email) {
      this.email
        .sendBookingConfirmation({
          to: result.client.email,
          clientName:
            `${result.client.firstName} ${result.client.lastName}`.trim(),
          bookingRequestId: result.booking.id,
        })
        .catch(() => void 0);
    }

    return {
      bookingId: result.booking.id,
      clientId: result.client.id,
      tattooDate: data.tattooDate,
      uploadToken: token,
    };
  }

  private async generateUploadToken(bookingRequestId: string, adminId: string) {
    // Token generated directly via prisma to avoid circular dependency
    const crypto = await import('crypto');
    const argon2 = await import('argon2');

    const secret = crypto.randomBytes(24).toString('base64url');
    const pepper = process.env.BOOKING_LINK_TOKEN_PEPPER ?? '';
    const secretHash = await argon2.hash(`${secret}:${pepper}`, {
      type: argon2.argon2id,
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4); // 4-hour window for tablet upload

    const tokenRow = await this.prisma.bookingLinkToken.create({
      data: {
        bookingRequestId,
        secretHash,
        scopes: ['UPLOAD', 'VIEW'],
        expiresAt,
        createdByAdminId: adminId,
      },
    });

    return `${tokenRow.id}.${secret}`;
  }

  async getPublicIntake(bookingRequestId: string) {
    const booking = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: {
        id: true,
        status: true,

        placement: true,
        sizeDescription: true,
        styleNotes: true,
        description: true,
        budgetRange: true,
        referencesNotes: true,

        preferredDateFrom: true,
        preferredDateTo: true,
        preferredTimeOfDay: true,
        preferredDaysNote: true,

        preferredArtistName: true,
        studioChooses: true,

        uploads: {
          select: {
            id: true,
            kind: true,
            secureUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },

        medicalDeclaration: true,
        consent: true,
      },
    });

    if (!booking) throw new NotFoundException('BookingRequest not found');
    return booking;
  }

  async updatePublicIntake(
    bookingRequestId: string,
    dto: PublicUpdateIntakeDto,
  ) {
    const booking = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: { id: true, status: true },
    });

    if (!booking) throw new NotFoundException('BookingRequest not found');

    const ALLOWED_EDIT_STATUSES = new Set<BookingStatus>(['PENDING_CONSULT']);
    if (!ALLOWED_EDIT_STATUSES.has(booking.status)) {
      throw new BadRequestException(
        `This booking cannot be edited at its current status (${booking.status})`,
      );
    }

    const preferredDateFrom = dto.preferredDateFrom
      ? new Date(dto.preferredDateFrom)
      : undefined;

    const preferredDateTo = dto.preferredDateTo
      ? new Date(dto.preferredDateTo)
      : undefined;

    if (preferredDateFrom && Number.isNaN(preferredDateFrom.getTime())) {
      throw new BadRequestException('Invalid preferredDateFrom');
    }
    if (preferredDateTo && Number.isNaN(preferredDateTo.getTime())) {
      throw new BadRequestException('Invalid preferredDateTo');
    }
    if (
      preferredDateFrom &&
      preferredDateTo &&
      preferredDateTo < preferredDateFrom
    ) {
      throw new BadRequestException(
        'preferredDateTo must be after preferredDateFrom',
      );
    }

    await this.prisma.bookingRequest.update({
      where: { id: bookingRequestId },
      data: {
        placement: dto.placement,
        sizeDescription: dto.sizeDescription,
        styleNotes: dto.styleNotes,
        description: dto.description,
        budgetRange: dto.budgetRange,
        referencesNotes: dto.referencesNotes,
        preferredArtistName: dto.preferredArtistName,
        studioChooses: dto.studioChooses,

        preferredDateFrom,
        preferredDateTo,
        preferredTimeOfDay: dto.preferredTimeOfDay,
        preferredDaysNote: dto.preferredDaysNote,
      },
    });

    return this.getPublicIntake(bookingRequestId);
  }

  async listAppointments(params: {
    date: string;
    period: Period;
    timezone: string;
  }) {
    const { date, period, timezone } = params;

    let range: { startUtc: Date; endUtc: Date; startDate: string; endDate: string };
    try {
      range = getUtcRangeForPeriod(date, period, timezone);
    } catch {
      throw new BadRequestException('Invalid date or timezone');
    }

    const { startUtc, endUtc, startDate, endDate } = range;

    // Consults: PENDING_CONSULT or CONSULT_APPROVED with consultDate in range
    const consults = await this.prisma.bookingRequest.findMany({
      where: {
        status: { in: [BookingStatus.PENDING_CONSULT, BookingStatus.CONSULT_APPROVED] },
        consultDate: { gte: startUtc, lt: endUtc },
      },
      include: { client: true },
      orderBy: { consultDate: 'asc' },
    });

    // Tattoo sessions: TATTOO_SCHEDULED or COMPLETED with a TattooSession.scheduledDate in range
    const tattooBookings = await this.prisma.bookingRequest.findMany({
      where: {
        status: { in: [BookingStatus.TATTOO_SCHEDULED, BookingStatus.COMPLETED] },
        tattooSessions: {
          some: { scheduledDate: { gte: startUtc, lt: endUtc } },
        },
      },
      include: {
        client: true,
        tattooSessions: {
          where: { scheduledDate: { gte: startUtc, lt: endUtc } },
          include: { artist: true },
          orderBy: { scheduledDate: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const consultEvents = consults.map((b) => ({
      eventType: 'CONSULT' as const,
      scheduledFor: b.consultDate,
      booking: b,
    }));

    const tattooEvents = tattooBookings.map((b) => ({
      eventType: 'TATTOO' as const,
      scheduledFor: b.tattooSessions[0]?.scheduledDate ?? null,
      booking: b,
    }));

    const items = [...consultEvents, ...tattooEvents].sort((a, b) => {
      const aTime = a.scheduledFor?.getTime() ?? Infinity;
      const bTime = b.scheduledFor?.getTime() ?? Infinity;
      return aTime - bTime;
    });

    return {
      period,
      date,
      startDate,
      endDate,
      timezone,
      total: items.length,
      items,
    };
  }
}
