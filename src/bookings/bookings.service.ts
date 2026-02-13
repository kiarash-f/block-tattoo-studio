import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, Prisma } from '@prisma/client';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  NEW: ['IN_REVIEW', 'NEEDS_INFO', 'APPROVED', 'REJECTED'],
  IN_REVIEW: ['NEEDS_INFO', 'APPROVED', 'REJECTED'],
  NEEDS_INFO: ['IN_REVIEW', 'APPROVED', 'REJECTED'],
  APPROVED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
};

// statuses that count as "reviewed" in your audit fields
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
    // IMPORTANT: avoid leaking AdminUser.passwordHash
    return this.prisma.bookingRequest.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        medicalDeclaration: true,
        consent: true,
        uploads: { orderBy: { createdAt: 'desc' } },
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
    },
  ) {
    // Load current status so we can validate transitions
    // If record doesn't exist, findUniqueOrThrow will trigger Prisma P2025 (handled by your filter)
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

    return this.prisma.bookingRequest.update({
      where: { id },
      data: {
        status: next,
        adminNotes: data.adminNotes,
        internalStatusNote: data.internalStatusNote,

        // only set review fields when status is considered "reviewed"
        ...(shouldSetReviewed
          ? {
              reviewedAt: new Date(),
              reviewedByAdminId: adminId,
            }
          : {}),
      },
    });
  }
}
