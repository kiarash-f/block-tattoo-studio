import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, StationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateConsultSlotDto } from './dto/create-consult-slot.dto';
import { AssignConsultSlotDto } from './dto/assign-consult-slot.dto';
import { CreateTattooSessionDto } from './dto/create-tattoo-session.dto';
import { UpdateTattooSessionDto } from './dto/update-tattoo-session.dto';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ─── Consult Slots ────────────────────────────────────────────────────────

  async createConsultSlot(dto: CreateConsultSlotDto) {
    const date = new Date(dto.date);

    if (date <= new Date()) {
      throw new BadRequestException('Consult slot date must be in the future');
    }

    const existing = await this.prisma.consultSlot.findUnique({
      where: { date },
    });
    if (existing) {
      throw new BadRequestException(
        'A consult slot already exists for this date',
      );
    }

    return this.prisma.consultSlot.create({
      data: { date, maxCount: dto.maxCount ?? 3 },
    });
  }

  async listConsultSlots() {
    const slots = await this.prisma.consultSlot.findMany({
      orderBy: { date: 'asc' },
      include: { _count: { select: { bookings: true } } },
    });

    return slots.map((s) => ({
      id: s.id,
      date: s.date,
      maxCount: s.maxCount,
      bookedCount: s._count.bookings,
      available: s._count.bookings < s.maxCount,
      createdAt: s.createdAt,
    }));
  }

  async deleteConsultSlot(id: string) {
    const slot = await this.prisma.consultSlot.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!slot) throw new NotFoundException('Consult slot not found');

    if (slot._count.bookings > 0) {
      throw new BadRequestException(
        'Cannot delete a slot that has bookings assigned',
      );
    }

    return this.prisma.consultSlot.delete({ where: { id } });
  }

  async assignConsultSlot(bookingId: string, dto: AssignConsultSlotDto) {
    const booking = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        consultSlotId: true,
        client: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException(
        'Booking must be APPROVED before assigning a consult slot',
      );
    }

    if (booking.consultSlotId) {
      throw new BadRequestException(
        'Booking already has a consult slot assigned',
      );
    }

    const slot = await this.prisma.consultSlot.findUnique({
      where: { id: dto.consultSlotId },
      include: { _count: { select: { bookings: true } } },
    });
    if (!slot) throw new NotFoundException('Consult slot not found');

    if (slot._count.bookings >= slot.maxCount) {
      throw new BadRequestException('Consult slot is fully booked');
    }

    if (slot.date <= new Date()) {
      throw new BadRequestException('Consult slot date is in the past');
    }

    const updated = await this.prisma.bookingRequest.update({
      where: { id: bookingId },
      data: { consultSlotId: dto.consultSlotId },
      select: {
        id: true,
        status: true,
        consultSlotId: true,
        consultSlot: { select: { id: true, date: true, maxCount: true } },
      },
    });

    if (booking.client.email && slot.date) {
      this.email
        .sendConsultConfirmation({
          to: booking.client.email,
          clientName: `${booking.client.firstName} ${booking.client.lastName}`.trim(),
          consultDate: slot.date,
        })
        .catch(() => void 0);
    }

    return updated;
  }

  // ─── Public Availability ──────────────────────────────────────────────────

  async getAvailableConsultDates(): Promise<{ availableDates: string[] }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slots = await this.prisma.consultSlot.findMany({
      where: { date: { gt: today } },
      orderBy: { date: 'asc' },
      include: { _count: { select: { bookings: true } } },
    });

    const availableDates = slots
      .filter((s) => s._count.bookings < s.maxCount)
      .map((s) => s.date.toISOString().split('T')[0]);

    return { availableDates };
  }

  // ─── Tattoo Sessions ──────────────────────────────────────────────────────

  async createTattooSession(bookingId: string, dto: CreateTattooSessionDto) {
    const booking = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException(
        'Booking must be APPROVED before creating a tattoo session',
      );
    }

    const scheduledDate = new Date(dto.scheduledDate);
    if (scheduledDate <= new Date()) {
      throw new BadRequestException('Session date must be in the future');
    }

    // Verify artist exists
    const artist = await this.prisma.artist.findUnique({
      where: { id: dto.artistId },
      select: { id: true },
    });
    if (!artist) throw new NotFoundException('Artist not found');

    // Auto-resolve the single active station
    const station = await this.prisma.studioStation.findFirst({
      where: { status: StationStatus.ACTIVE },
      select: { id: true },
    });

    return this.prisma.tattooSession.create({
      data: {
        bookingRequestId: bookingId,
        artistId: dto.artistId,
        stationId: station?.id ?? null,
        scheduledDate,
        durationNote: dto.durationNote,
        notes: dto.notes,
      },
      include: {
        artist: { select: { id: true, displayName: true } },
        station: { select: { id: true, name: true } },
      },
    });
  }

  async listTattooSessions(bookingId: string) {
    const booking = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingId },
      select: { id: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    return this.prisma.tattooSession.findMany({
      where: { bookingRequestId: bookingId },
      orderBy: { scheduledDate: 'asc' },
      include: {
        artist: { select: { id: true, displayName: true } },
        station: { select: { id: true, name: true } },
      },
    });
  }

  async updateTattooSession(sessionId: string, dto: UpdateTattooSessionDto) {
    const session = await this.prisma.tattooSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Tattoo session not found');

    if (dto.scheduledDate) {
      const date = new Date(dto.scheduledDate);
      if (date <= new Date()) {
        throw new BadRequestException('Session date must be in the future');
      }
    }

    if (dto.artistId) {
      const artist = await this.prisma.artist.findUnique({
        where: { id: dto.artistId },
        select: { id: true },
      });
      if (!artist) throw new NotFoundException('Artist not found');
    }

    return this.prisma.tattooSession.update({
      where: { id: sessionId },
      data: {
        ...(dto.scheduledDate
          ? { scheduledDate: new Date(dto.scheduledDate) }
          : {}),
        ...(dto.artistId ? { artistId: dto.artistId } : {}),
        ...(dto.durationNote !== undefined
          ? { durationNote: dto.durationNote }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        artist: { select: { id: true, displayName: true } },
        station: { select: { id: true, name: true } },
      },
    });
  }

  async completeTattooSession(sessionId: string) {
    const session = await this.prisma.tattooSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Tattoo session not found');

    if (session.completedAt) {
      throw new BadRequestException('Session is already marked as completed');
    }

    return this.prisma.tattooSession.update({
      where: { id: sessionId },
      data: { completedAt: new Date() },
      include: {
        artist: { select: { id: true, displayName: true } },
        station: { select: { id: true, name: true } },
      },
    });
  }

  async deleteTattooSession(sessionId: string) {
    const session = await this.prisma.tattooSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Tattoo session not found');

    return this.prisma.tattooSession.delete({ where: { id: sessionId } });
  }
}
