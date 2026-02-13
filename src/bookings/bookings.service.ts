import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async list(params: {
    status?: string;
    q?: string;
    page: number;
    limit: number;
  }) {
    const { status, q, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    if (q) {
      where.client = {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.bookingRequest.count({ where }),
      this.prisma.bookingRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { client: true },
      }),
    ]);

    return { total, page, limit, items };
  }

  async detail(id: string) {
    const br = await this.prisma.bookingRequest.findUnique({
      where: { id },
      include: {
        client: true,
        medicalDeclaration: true,
        consent: true,
        uploads: { orderBy: { createdAt: 'desc' } },
        reviewedByAdmin: true,
      },
    });
    if (!br) throw new NotFoundException('BookingRequest not found');
    return br;
  }

  async updateStatus(
    id: string,
    adminId: string,
    data: { status: string; adminNotes?: string; internalStatusNote?: string },
  ) {
    const exists = await this.prisma.bookingRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('BookingRequest not found');

    return this.prisma.bookingRequest.update({
      where: { id },
      data: {
        status: data.status as any,
        adminNotes: data.adminNotes,
        internalStatusNote: data.internalStatusNote,
        reviewedAt: new Date(),
        reviewedByAdminId: adminId,
      },
    });
  }
}
