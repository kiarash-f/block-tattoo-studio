import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateConsultSlotDto } from './dto/create-consult-slot.dto';
import { AssignConsultSlotDto } from './dto/assign-consult-slot.dto';
import { UpdateTattooSessionDto } from './dto/update-tattoo-session.dto';
import {
  SessionWindowService,
  ValidatedWindow,
} from './session-window.service';

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly window: SessionWindowService,
  ) {}

  // ─── Consult Slots ────────────────────────────────────────────────────────

  async createConsultSlot(dto: CreateConsultSlotDto) {
    const now = new Date();
    const maxCount = dto.maxCount ?? 3;
    const created: { id: string; date: Date; maxCount: number; createdAt: Date; updatedAt: Date }[] = [];
    const skipped: { date: string; reason: string }[] = [];

    for (const raw of dto.dates) {
      const date = new Date(raw);

      if (date <= now) {
        skipped.push({ date: raw, reason: 'date is in the past' });
        continue;
      }

      const existing = await this.prisma.consultSlot.findUnique({ where: { date } });
      if (existing) {
        skipped.push({ date: raw, reason: 'slot already exists' });
        continue;
      }

      const slot = await this.prisma.consultSlot.create({
        data: { date, maxCount },
      });
      created.push(slot);
    }

    return { created, skipped };
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

    if (booking.status !== BookingStatus.PENDING_CONSULT) {
      throw new BadRequestException(
        'Booking must be PENDING_CONSULT before assigning a consult slot',
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
          clientName:
            `${booking.client.firstName} ${booking.client.lastName}`.trim(),
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

    // Window edit: if either bound is supplied, validate the full (merged) window
    // via the same shared helper the scheduling paths use.
    const editingWindow =
      dto.startsAt !== undefined || dto.endsAt !== undefined;
    let nextWindow: ValidatedWindow | null = null;
    if (editingWindow) {
      nextWindow = this.window.parseWindow(
        dto.startsAt ?? session.startsAt?.toISOString() ?? null,
        dto.endsAt ?? session.endsAt?.toISOString() ?? null,
      );
    }

    // Re-run the collision check whenever the session MOVES (artist, day, or
    // window changes) and an effective window exists — so an edit can't create
    // an overlap. Exclude this session so it doesn't clash with its own row.
    const nextArtistId = dto.artistId ?? session.artistId;
    const nextScheduledDate = dto.scheduledDate
      ? new Date(dto.scheduledDate)
      : session.scheduledDate;
    const effStartsAt = nextWindow?.startsAt ?? session.startsAt;
    const effEndsAt = nextWindow?.endsAt ?? session.endsAt;
    const moved =
      dto.artistId !== undefined ||
      dto.scheduledDate !== undefined ||
      editingWindow;
    if (moved && effStartsAt && effEndsAt) {
      await this.window.assertNoArtistCollision({
        artistId: nextArtistId,
        scheduledDate: nextScheduledDate,
        startsAt: effStartsAt,
        endsAt: effEndsAt,
        excludeSessionId: sessionId,
      });
    }

    return this.prisma.tattooSession.update({
      where: { id: sessionId },
      data: {
        ...(dto.scheduledDate ? { scheduledDate: nextScheduledDate } : {}),
        ...(dto.artistId ? { artistId: dto.artistId } : {}),
        ...(nextWindow
          ? { startsAt: nextWindow.startsAt, endsAt: nextWindow.endsAt }
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
