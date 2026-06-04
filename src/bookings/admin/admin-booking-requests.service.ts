import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitInStudioFormDto } from './dto/in-studio-form.dto';
import { BookingStatus } from '@prisma/client';
import { DateTime } from 'luxon';

@Injectable()
export class AdminBookingRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(bookingRequestId: string, adminId: string) {
    if (!adminId) throw new ForbiddenException('Missing admin identity');

    const br = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: { id: true, status: true, checkedInAt: true },
    });
    if (!br) throw new NotFoundException('BookingRequest not found');

    if (br.status !== BookingStatus.TATTOO_SCHEDULED) {
      throw new BadRequestException(
        'Only TATTOO_SCHEDULED bookings can be checked in',
      );
    }

    // Idempotent
    if (br.checkedInAt) {
      return this.prisma.bookingRequest.findUnique({
        where: { id: bookingRequestId },
        include: { client: true, assignments: true },
      });
    }

    return this.prisma.bookingRequest.update({
      where: { id: bookingRequestId },
      data: {
        checkedInAt: new Date(),
        checkedInByAdminId: adminId,
      },
      include: { client: true, assignments: true },
    });
  }

  async getInStudioForm(bookingRequestId: string) {
    const br = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      include: {
        client: true,
        medicalDeclaration: true,
        consent: true,
        assignments: {
          include: { artist: true, station: true },
        },
      },
    });

    if (!br) throw new NotFoundException('BookingRequest not found');

    // Return only what UI needs (avoid leaking more than necessary)
    return {
      id: br.id,
      status: br.status,
      checkedInAt: br.checkedInAt,
      inStudioCompletedAt: br.inStudioCompletedAt,
      client: br.client,
      primaryAssignment:
        br.assignments?.find((a) => a.role === 'PRIMARY') ?? null,
      medicalDeclaration: br.medicalDeclaration,
      consent: br.consent,
    };
  }

  async submitInStudioForm(
    bookingRequestId: string,
    adminId: string,
    dto: SubmitInStudioFormDto,
  ) {
    if (!adminId) throw new ForbiddenException('Missing admin identity');

    const br = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: { id: true, status: true, checkedInAt: true },
    });
    if (!br) throw new NotFoundException('BookingRequest not found');

    if (br.status !== BookingStatus.TATTOO_SCHEDULED) {
      throw new BadRequestException(
        'In-studio form can only be submitted for TATTOO_SCHEDULED bookings',
      );
    }

    if (!br.checkedInAt) {
      throw new BadRequestException(
        'Client must be checked-in before submitting in-studio form',
      );
    }

    const signedAtDate = dto.consent.signedAt
      ? DateTime.fromISO(dto.consent.signedAt).toJSDate()
      : null;

    // Transaction so we never partially write
    const result = await this.prisma.$transaction(async (tx) => {
      const now = new Date();

      const medical = await tx.medicalDeclaration.upsert({
        where: { bookingRequestId },
        create: {
          bookingRequestId,
          ...dto.medical,
          submittedAt: now,
          submittedByAdminId: adminId,
        },
        update: {
          ...dto.medical,
          submittedAt: now,
          submittedByAdminId: adminId,
        },
      });

      const consent = await tx.consent.upsert({
        where: { bookingRequestId },
        create: {
          bookingRequestId,
          isAdultConfirmed: dto.consent.isAdultConfirmed,
          termsAccepted: dto.consent.termsAccepted,
          privacyAccepted: dto.consent.privacyAccepted,
          fullName: dto.consent.fullName ?? null,
          signedAt: signedAtDate,
          submittedAt: now,
          submittedByAdminId: adminId,
        },
        update: {
          isAdultConfirmed: dto.consent.isAdultConfirmed,
          termsAccepted: dto.consent.termsAccepted,
          privacyAccepted: dto.consent.privacyAccepted,
          fullName: dto.consent.fullName ?? null,
          signedAt: signedAtDate,
          submittedAt: now,
          submittedByAdminId: adminId,
        },
      });

      const booking = await tx.bookingRequest.update({
        where: { id: bookingRequestId },
        data: { inStudioCompletedAt: now },
        include: { client: true },
      });

      return { booking, medical, consent };
    });

    return result;
  }
}
