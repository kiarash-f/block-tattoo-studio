import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { TranslationService } from '../translation/translation.service';
import { ArtistsService } from './artists.service';

/**
 * ArtistsService with a mocked interactive Prisma ($transaction runs the
 * callback against txMock), mocked Cloudinary + DeepL. tx.artist.create echoes
 * its `data` so the mapped fields are readable.
 */
async function createService() {
  const txMock = {
    artist: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'a1', ...data }),
      ),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'a1', ...data }),
      ),
      findFirst: jest.fn().mockResolvedValue(null), // assertUniqueFields: no conflict
    },
    artistWork: { createMany: jest.fn() },
  };
  const prisma = {
    artist: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: typeof txMock) => unknown)(txMock)
        : Promise.all(arg as Promise<unknown>[]),
    ),
  };
  const media = { uploadBuffer: jest.fn() };
  const translation = { translate: jest.fn().mockResolvedValue('x') };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ArtistsService,
      { provide: PrismaService, useValue: prisma },
      { provide: MediaService, useValue: media },
      { provide: TranslationService, useValue: translation },
    ],
  }).compile();

  return {
    service: module.get<ArtistsService>(ArtistsService),
    prisma,
    txMock,
    media,
  };
}

describe('ArtistsService — availability date-order validation', () => {
  it('(c) create rejects availableTo before availableFrom (before any upload)', async () => {
    const { service, prisma, media } = await createService();
    await expect(
      service.createWithMedia(
        {
          displayName: 'Alex',
          availableFrom: '2026-07-08',
          availableTo: '2026-07-05',
        } as any,
        // a cover file is present — fail-fast must reject before uploading it
        { cover: [{ buffer: Buffer.from('x'), originalname: 'c.png' } as any] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(media.uploadBuffer).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('(c) update rejects effective availableTo before stored availableFrom', async () => {
    const { service, prisma } = await createService();
    prisma.artist.findUnique.mockResolvedValue({
      id: 'a1', handle: null, slug: 'alex', displayName: 'Alex', works: [],
      availableFrom: new Date('2026-07-10'), availableTo: null,
    });
    await expect(
      service.updateWithMedia('a1', { availableTo: '2026-07-05' } as any, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('maps guest fields and normalizes the instagram handle on a valid create', async () => {
    const { service, txMock } = await createService();
    await service.createWithMedia(
      {
        displayName: 'Alex',
        availableFrom: '2026-07-05',
        availableTo: '2026-07-08',
        isFeaturedGuest: true,
        instagram: '@alex.ink',
      } as any,
      {},
    );
    const data = txMock.artist.create.mock.calls[0][0].data;
    expect(data.isFeaturedGuest).toBe(true);
    expect(data.availableFrom).toEqual(new Date('2026-07-05'));
    expect(data.availableTo).toEqual(new Date('2026-07-08'));
    expect(data.instagram).toBe('alex.ink'); // leading "@" stripped
  });
});

describe('ArtistsService — tolerates undefined files (no-files edit)', () => {
  it('(d) updateWithMedia succeeds when files is undefined (no crash)', async () => {
    const { service, prisma, media } = await createService();
    prisma.artist.findUnique.mockResolvedValue({
      id: 'a1', slug: 'alex', handle: 'alex', displayName: 'Alex',
      availableFrom: null, availableTo: null, works: [],
    });

    const res = await service.updateWithMedia(
      'a1',
      { displayName: 'Alex' } as any,
      undefined as any,
    );

    expect(res).toBeDefined();
    expect(media.uploadBuffer).not.toHaveBeenCalled();
  });

  it('(d) createWithMedia succeeds when files is undefined (no crash)', async () => {
    const { service, media } = await createService();

    const res = await service.createWithMedia(
      { displayName: 'Alex' } as any,
      undefined as any,
    );

    expect(res).toBeDefined();
    expect(media.uploadBuffer).not.toHaveBeenCalled();
  });
});
