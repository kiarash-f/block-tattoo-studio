import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentRole,
  ArtistStatus,
  Prisma,
  StationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingAssignmentDto } from './dto/create-booking-assignment.dto';
import { UpdateBookingAssignmentDto } from './dto/update-booking-assignment.dto';

@Injectable()
export class BookingAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(bookingRequestId: string, dto: CreateBookingAssignmentDto) {
    const role = dto.role ?? AssignmentRole.PRIMARY;

    const { startsAt, endsAt } = this.parseAndValidateTimeRange(
      dto.startsAt,
      dto.endsAt,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1) BookingRequest exists
      const bookingRequest = await tx.bookingRequest.findUnique({
        where: { id: bookingRequestId },
        select: { id: true },
      });
      if (!bookingRequest)
        throw new NotFoundException('BookingRequest not found');

      // 2) Artist exists + active
      const artist = await tx.artist.findUnique({
        where: { id: dto.artistId },
        select: { id: true, status: true },
      });
      if (!artist) throw new NotFoundException('Artist not found');
      if (artist.status !== ArtistStatus.ACTIVE)
        throw new BadRequestException('Artist is not active');

      // 3) Station exists + active (if provided)
      if (dto.stationId) {
        const station = await tx.studioStation.findUnique({
          where: { id: dto.stationId },
          select: { id: true, status: true },
        });
        if (!station) throw new NotFoundException('Studio station not found');
        if (station.status !== StationStatus.ACTIVE)
          throw new BadRequestException('Studio station is not active');
      }

      // 4) Ensure one PRIMARY per BookingRequest (service-level)
      if (role === AssignmentRole.PRIMARY) {
        const existingPrimary = await tx.bookingAssignment.findFirst({
          where: { bookingRequestId, role: AssignmentRole.PRIMARY },
          select: { id: true },
        });
        if (existingPrimary) {
          throw new BadRequestException(
            'BookingRequest already has a PRIMARY assignment',
          );
        }
      }

      // 5) Create
      return tx.bookingAssignment.create({
        data: {
          bookingRequestId,
          artistId: dto.artistId,
          stationId: dto.stationId ?? null,
          role,
          startsAt,
          endsAt,
          note: dto.note,
        },
        include: {
          artist: true,
          station: true,
        },
      });
    });
  }

  async list(bookingRequestId: string) {
    // verify bookingRequest exists (optional but nice for 404 vs empty)
    const exists = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('BookingRequest not found');

    return this.prisma.bookingAssignment.findMany({
      where: { bookingRequestId },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      include: { artist: true, station: true },
    });
  }

  async update(
    bookingRequestId: string,
    assignmentId: string,
    dto: UpdateBookingAssignmentDto,
  ) {
    const { startsAt, endsAt } = this.parseAndValidateTimeRange(
      dto.startsAt,
      dto.endsAt,
    );

    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.bookingAssignment.findFirst({
        where: { id: assignmentId, bookingRequestId },
        select: { id: true, role: true },
      });
      if (!assignment)
        throw new NotFoundException(
          'Assignment not found for this BookingRequest',
        );

      const nextRole = dto.role ?? assignment.role;

      // Validate artist if changed
      if (dto.artistId) {
        const artist = await tx.artist.findUnique({
          where: { id: dto.artistId },
          select: { id: true, status: true },
        });
        if (!artist) throw new NotFoundException('Artist not found');
        if (artist.status !== ArtistStatus.ACTIVE)
          throw new BadRequestException('Artist is not active');
      }

      // Validate station if changed
      if (dto.stationId !== undefined && dto.stationId !== null) {
        // dto.stationId may be '' from client; normalize
        if (dto.stationId === '') {
          throw new BadRequestException('stationId cannot be empty string');
        }
        if (dto.stationId) {
          const station = await tx.studioStation.findUnique({
            where: { id: dto.stationId },
            select: { id: true, status: true },
          });
          if (!station) throw new NotFoundException('Studio station not found');
          if (station.status !== StationStatus.ACTIVE)
            throw new BadRequestException('Studio station is not active');
        }
      }

      // PRIMARY uniqueness if role becomes PRIMARY and it's not already PRIMARY
      if (
        nextRole === AssignmentRole.PRIMARY &&
        assignment.role !== AssignmentRole.PRIMARY
      ) {
        const existingPrimary = await tx.bookingAssignment.findFirst({
          where: {
            bookingRequestId,
            role: AssignmentRole.PRIMARY,
            id: { not: assignmentId },
          },
          select: { id: true },
        });
        if (existingPrimary)
          throw new BadRequestException(
            'BookingRequest already has a PRIMARY assignment',
          );
      }

      return tx.bookingAssignment.update({
        where: { id: assignmentId },
        data: {
          ...(dto.artistId !== undefined ? { artistId: dto.artistId } : {}),
          ...(dto.stationId !== undefined
            ? { stationId: dto.stationId ?? null }
            : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
          ...(dto.note !== undefined ? { note: dto.note } : {}),
          ...(dto.startsAt !== undefined || dto.endsAt !== undefined
            ? { startsAt, endsAt }
            : {}),
        },
        include: { artist: true, station: true },
      });
    });
  }

  async remove(bookingRequestId: string, assignmentId: string) {
    const existing = await this.prisma.bookingAssignment.findFirst({
      where: { id: assignmentId, bookingRequestId },
      select: { id: true },
    });
    if (!existing)
      throw new NotFoundException(
        'Assignment not found for this BookingRequest',
      );

    return this.prisma.bookingAssignment.delete({
      where: { id: assignmentId },
    });
  }

  private parseAndValidateTimeRange(
    startsAt?: string,
    endsAt?: string,
  ): {
    startsAt: Date | null;
    endsAt: Date | null;
  } {
    const hasStart = startsAt !== undefined && startsAt !== null;
    const hasEnd = endsAt !== undefined && endsAt !== null;

    if (!hasStart && !hasEnd) return { startsAt: null, endsAt: null };

    if (!startsAt || !endsAt) {
      throw new BadRequestException(
        'startsAt and endsAt must be provided together',
      );
    }

    const s = new Date(startsAt);
    const e = new Date(endsAt);

    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      throw new BadRequestException('Invalid startsAt or endsAt');
    }
    if (e <= s) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return { startsAt: s, endsAt: e };
  }
}
