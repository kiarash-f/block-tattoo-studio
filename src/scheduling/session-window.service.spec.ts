import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SessionWindowService } from './session-window.service';

async function createService() {
  const prisma = {
    tattooSession: { findMany: jest.fn() },
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SessionWindowService,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();
  return {
    service: module.get<SessionWindowService>(SessionWindowService),
    prisma,
  };
}

describe('SessionWindowService — parseWindow', () => {
  it('(d) rejects endsAt equal to startsAt', async () => {
    const { service } = await createService();
    expect(() =>
      service.parseWindow('2026-07-05T15:00:00Z', '2026-07-05T15:00:00Z'),
    ).toThrow(BadRequestException);
  });

  it('(d) rejects endsAt before startsAt', async () => {
    const { service } = await createService();
    expect(() =>
      service.parseWindow('2026-07-05T17:00:00Z', '2026-07-05T15:00:00Z'),
    ).toThrow(BadRequestException);
  });

  it('rejects a missing bound (both required)', async () => {
    const { service } = await createService();
    expect(() =>
      service.parseWindow('2026-07-05T15:00:00Z', undefined),
    ).toThrow(BadRequestException);
    expect(() =>
      service.parseWindow(undefined, '2026-07-05T17:00:00Z'),
    ).toThrow(BadRequestException);
  });

  it('rejects an invalid date', async () => {
    const { service } = await createService();
    expect(() =>
      service.parseWindow('not-a-date', '2026-07-05T17:00:00Z'),
    ).toThrow(BadRequestException);
  });

  it('returns Date objects for a valid window', async () => {
    const { service } = await createService();
    const w = service.parseWindow('2026-07-05T15:00:00Z', '2026-07-05T17:00:00Z');
    expect(w.startsAt).toEqual(new Date('2026-07-05T15:00:00Z'));
    expect(w.endsAt).toEqual(new Date('2026-07-05T17:00:00Z'));
  });
});

describe('SessionWindowService — assertNoArtistCollision', () => {
  const base = {
    artistId: 'A',
    scheduledDate: new Date('2026-07-05T00:00:00Z'),
    startsAt: new Date('2026-07-05T15:00:00Z'),
    endsAt: new Date('2026-07-05T17:00:00Z'),
  };

  it('(a) rejects an overlapping window for the same artist same day', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([
      {
        id: 's1',
        startsAt: new Date('2026-07-05T16:00:00Z'),
        endsAt: new Date('2026-07-05T18:00:00Z'),
      },
    ]);
    await expect(service.assertNoArtistCollision(base)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('(b) is scoped per-artist — the candidate query filters by the requested artistId', async () => {
    const { service, prisma } = await createService();
    // A different artist's sessions are excluded by the artistId filter → no rows.
    prisma.tattooSession.findMany.mockResolvedValue([]);
    await expect(
      service.assertNoArtistCollision(base),
    ).resolves.toBeUndefined();
    expect(prisma.tattooSession.findMany.mock.calls[0][0].where.artistId).toBe(
      'A',
    );
  });

  it('(c) allows a non-overlapping window for the same artist same day', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([
      {
        id: 's1',
        startsAt: new Date('2026-07-05T10:00:00Z'),
        endsAt: new Date('2026-07-05T12:00:00Z'),
      },
    ]);
    await expect(
      service.assertNoArtistCollision(base),
    ).resolves.toBeUndefined();
  });

  it('(e) excludes cancelled/completed bookings and finished/windowless sessions', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([]);
    await service.assertNoArtistCollision(base);
    const where = prisma.tattooSession.findMany.mock.calls[0][0].where;
    expect(where.completedAt).toBeNull();
    expect(where.startsAt).toEqual({ not: null });
    expect(where.endsAt).toEqual({ not: null });
    expect(where.bookingRequest.status.notIn).toEqual(
      expect.arrayContaining([BookingStatus.CANCELLED, BookingStatus.COMPLETED]),
    );
  });

  it('treats touching windows (end == next start) as NOT overlapping (half-open)', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([
      {
        id: 's1',
        startsAt: new Date('2026-07-05T17:00:00Z'),
        endsAt: new Date('2026-07-05T19:00:00Z'),
      },
    ]);
    await expect(
      service.assertNoArtistCollision(base),
    ).resolves.toBeUndefined();
  });

  it('passes excludeSessionId through to the query (edit path)', async () => {
    const { service, prisma } = await createService();
    prisma.tattooSession.findMany.mockResolvedValue([]);
    await service.assertNoArtistCollision({ ...base, excludeSessionId: 'self' });
    expect(prisma.tattooSession.findMany.mock.calls[0][0].where.id).toEqual({
      not: 'self',
    });
  });
});
