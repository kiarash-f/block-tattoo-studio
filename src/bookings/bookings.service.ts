import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BookingStatus,
  Prisma,
  CancelReason,
  AssignmentRole,
} from '@prisma/client';
import { PublicUpdateIntakeDto } from '../booking-links/dto/public-update-intake.dto';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  NEW: ['IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED'],
  IN_REVIEW: ['NEEDS_INFO', 'APPROVED', 'REJECTED'],
  NEEDS_INFO: ['IN_REVIEW', 'APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

const REVIEWED_STATUSES: BookingStatus[] = [
  'IN_REVIEW',
  'NEEDS_INFO',
  'APPROVED',
  'REJECTED',
];

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

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
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  async detail(id: string) {
    return this.prisma.bookingRequest.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        medicalDeclaration: true,
        consent: true,
        uploads: { orderBy: { createdAt: 'desc' } },
        assignments: {
          include: { artist: true, station: true },
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        },
        reviewedByAdmin: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
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

    const allowedNext = ALLOWED_TRANSITIONS[current.status] ?? [];
    if (!allowedNext.includes(next) && current.status !== next) {
      throw new BadRequestException(
        `Invalid status transition: ${current.status} -> ${next}`,
      );
    }

    const shouldSetReviewed = REVIEWED_STATUSES.includes(next);
    const now = new Date();

    // ✅ OPTIONAL guard: for COMPLETED or NO_SHOW, ensure appointment startsAt is in the past
    if (
      next === BookingStatus.COMPLETED ||
      (next === BookingStatus.CANCELLED &&
        data.cancelReason === CancelReason.NO_SHOW)
    ) {
      const primary = await this.prisma.bookingAssignment.findFirst({
        where: {
          bookingRequestId: id,
          role: AssignmentRole.PRIMARY,
        },
        select: { startsAt: true },
      });

      if (!primary?.startsAt) {
        throw new BadRequestException(
          'Cannot complete/no-show: PRIMARY assignment startsAt is missing',
        );
      }

      if (primary.startsAt > now) {
        throw new BadRequestException(
          'Cannot complete/no-show before the appointment time',
        );
      }
    }

    // ✅ enforce cancelReason when cancelling
    if (next === BookingStatus.CANCELLED) {
      if (!data.cancelReason) {
        // choose one:
        // throw new BadRequestException('cancelReason is required when status=CANCELLED');
        data.cancelReason = CancelReason.OTHER; // or default NO_SHOW if you prefer
      }
    }

    // ✅ build event timestamp updates
    const eventFields: Prisma.BookingRequestUpdateInput = {};

    if (next === BookingStatus.APPROVED) {
      eventFields.approvedAt = now;
    }

    if (next === BookingStatus.COMPLETED) {
      eventFields.completedAt = now;
      // optional cleanup
      eventFields.cancelledAt = null;
      eventFields.cancelReason = null;
    }

    if (next === BookingStatus.CANCELLED) {
      eventFields.cancelledAt = now;
      eventFields.cancelReason = data.cancelReason;
      // optional cleanup
      eventFields.completedAt = null;
    }

    return this.prisma.bookingRequest.update({
      where: { id },
      data: {
        status: next,
        adminNotes: data.adminNotes,
        internalStatusNote: data.internalStatusNote,

        ...eventFields,

        ...(shouldSetReviewed
          ? {
              reviewedAt: now,
              reviewedByAdmin: { connect: { id: adminId } },
            }
          : {}),
      },
    });
  }

  /**
   * Public (token-based) read of intake fields.
   * Only selects fields safe for the client to see.
   */
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
            // ⚠️ Replace this with your real Upload URL field name:
            // publicUrl / secureUrl / cloudinaryUrl / fileUrl / etc.
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

  /**
   * Public (token-based) update of intake fields.
   * Guardrails:
   * - Only allowed in NEW or NEEDS_INFO (your current workflow)
   * - Updates only allow-listed fields (no status/admin fields)
   */
  async updatePublicIntake(
    bookingRequestId: string,
    dto: PublicUpdateIntakeDto,
  ) {
    const booking = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: { id: true, status: true },
    });

    if (!booking) throw new NotFoundException('BookingRequest not found');

    const ALLOWED_EDIT_STATUSES = new Set<BookingStatus>(['NEW', 'NEEDS_INFO']);

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
}
