import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SchedulingService } from './scheduling.service';
import { SessionWindowService } from './session-window.service';

/**
 * M12 — consult-slot capacity must count only bookings that actually hold a
 * seat. Admin slot listing and assignConsultSlot used to count bookings in
 * EVERY status, so a cancelled consult permanently consumed capacity and could
 * block assignment to a slot that was really free. The public availability
 * endpoint always filtered correctly; these tests pin all three to the same
 * rule so the admin and public views can't disagree again.
 */
async function createService() {
  const prisma = {
    consultSlot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    bookingRequest: { findUnique: jest.fn(), update: jest.fn() },
    tattooSession: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const email = { sendConsultConfirmation: jest.fn(async () => undefined) };
  const window = {
    parseWindow: jest.fn(),
    assertNoArtistCollision: jest.fn(),
    lockArtistAndAssertNoCollision: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SchedulingService,
      { provide: PrismaService, useValue: prisma },
      { provide: EmailService, useValue: email },
      { provide: SessionWindowService, useValue: window },
    ],
  }).compile();

  return {
    service: module.get<SchedulingService>(SchedulingService),
    prisma,
    email,
  };
}

/** The status filter every capacity path must apply. */
const EXPECTED_FILTER = {
  where: {
    status: {
      in: [BookingStatus.PENDING_CONSULT, BookingStatus.CONSULT_APPROVED],
    },
  },
};

describe('SchedulingService — consult-slot capacity counting (M12)', () => {
  const futureDate = new Date(Date.now() + 7 * 86_400_000);

  it('listConsultSlots counts only capacity-consuming bookings', async () => {
    const { service, prisma } = await createService();
    prisma.consultSlot.findMany.mockResolvedValue([
      {
        id: 's1',
        date: futureDate,
        maxCount: 3,
        createdAt: new Date(),
        _count: { bookings: 1 },
      },
    ]);

    const slots = await service.listConsultSlots();

    expect(prisma.consultSlot.findMany.mock.calls[0][0].include._count).toEqual({
      select: { bookings: EXPECTED_FILTER },
    });
    // 1 of 3 seats taken → still available.
    expect(slots[0].bookedCount).toBe(1);
    expect(slots[0].available).toBe(true);
  });

  it('getAvailableConsultDates counts only capacity-consuming bookings', async () => {
    // The public booking form's endpoint — same bug, one the audit missed.
    const { service, prisma } = await createService();
    prisma.consultSlot.findMany.mockResolvedValue([
      { date: futureDate, maxCount: 3, _count: { bookings: 2 } },
    ]);

    const { availableDates } = await service.getAvailableConsultDates();

    expect(prisma.consultSlot.findMany.mock.calls[0][0].include._count).toEqual({
      select: { bookings: EXPECTED_FILTER },
    });
    expect(availableDates).toHaveLength(1);
  });

  it('assignConsultSlot counts only capacity-consuming bookings', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findUnique.mockResolvedValue({
      id: 'b1',
      status: BookingStatus.PENDING_CONSULT,
      consultSlotId: null,
      client: { email: null, firstName: 'A', lastName: 'B' },
    });
    prisma.consultSlot.findUnique.mockResolvedValue({
      id: 's1',
      date: futureDate,
      maxCount: 3,
      _count: { bookings: 2 },
    });
    prisma.bookingRequest.update.mockResolvedValue({ id: 'b1' });

    await service.assignConsultSlot('b1', { consultSlotId: 's1' });

    expect(
      prisma.consultSlot.findUnique.mock.calls[0][0].include._count,
    ).toEqual({ select: { bookings: EXPECTED_FILTER } });
    expect(prisma.bookingRequest.update).toHaveBeenCalled();
  });

  it('assignment into a slot whose seats are all live bookings is refused', async () => {
    const { service, prisma } = await createService();
    prisma.bookingRequest.findUnique.mockResolvedValue({
      id: 'b1',
      status: BookingStatus.PENDING_CONSULT,
      consultSlotId: null,
      client: { email: null, firstName: 'A', lastName: 'B' },
    });
    prisma.consultSlot.findUnique.mockResolvedValue({
      id: 's1',
      date: futureDate,
      maxCount: 3,
      _count: { bookings: 3 },
    });

    await expect(
      service.assignConsultSlot('b1', { consultSlotId: 's1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.bookingRequest.update).not.toHaveBeenCalled();
  });

  it('a slot whose bookings were all cancelled is assignable again', async () => {
    // The regression M12 fixes: with the filter, a slot holding 3 cancelled
    // consults reports 0 seats used, so it accepts a booking instead of
    // reading as permanently full.
    const { service, prisma } = await createService();
    prisma.bookingRequest.findUnique.mockResolvedValue({
      id: 'b1',
      status: BookingStatus.PENDING_CONSULT,
      consultSlotId: null,
      client: { email: null, firstName: 'A', lastName: 'B' },
    });
    prisma.consultSlot.findUnique.mockResolvedValue({
      id: 's1',
      date: futureDate,
      maxCount: 3,
      _count: { bookings: 0 }, // filtered count — cancelled rows excluded
    });
    prisma.bookingRequest.update.mockResolvedValue({ id: 'b1' });

    await expect(
      service.assignConsultSlot('b1', { consultSlotId: 's1' }),
    ).resolves.toBeDefined();
  });

  it('deleteConsultSlot deliberately still counts bookings in every status', async () => {
    // Intentional asymmetry: deletion must not orphan a cancelled consult's
    // reference to the slot, so ANY attached booking blocks it.
    const { service, prisma } = await createService();
    prisma.consultSlot.findUnique.mockResolvedValue({
      id: 's1',
      _count: { bookings: 1 },
    });

    await expect(service.deleteConsultSlot('s1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(
      prisma.consultSlot.findUnique.mock.calls[0][0].include._count,
    ).toEqual({ select: { bookings: true } });
  });
});

describe('SchedulingService — TattooSession soft-delete (§8.3c)', () => {
  it('archives instead of hard-deleting, stamping archivedAt', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findUnique.mockResolvedValue({
      id: 't1',
      archivedAt: null,
    });
    prisma.tattooSession.update.mockResolvedValue({ id: 't1' });

    await service.deleteTattooSession('t1');

    const call = prisma.tattooSession.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 't1' });
    expect(call.data.archivedAt).toBeInstanceOf(Date);
  });

  it('404s an already-archived session (double-delete is a no-op)', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findUnique.mockResolvedValue({
      id: 't1',
      archivedAt: new Date(),
    });

    await expect(service.deleteTattooSession('t1')).rejects.toThrow(
      /not found/i,
    );
    expect(prisma.tattooSession.update).not.toHaveBeenCalled();
  });
});
