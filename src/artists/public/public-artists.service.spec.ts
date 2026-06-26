import { Test, TestingModule } from '@nestjs/testing';
import { ArtistStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicArtistsService } from './public-artists.service';

async function createService() {
  const prisma = {
    artist: { findFirst: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    artistWork: { count: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      PublicArtistsService,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();
  return {
    service: module.get<PublicArtistsService>(PublicArtistsService),
    prisma,
  };
}

describe('PublicArtistsService — artist profile (by slug)', () => {
  it('(a) includes the guest fields when set, dates as YYYY-MM-DD', async () => {
    const { service, prisma } = await createService();
    prisma.artist.findFirst.mockResolvedValue({
      id: 'a1', slug: 'alex', handle: 'alex', displayName: 'Alex',
      avatarUrl: null, coverUrl: null, bio: 'b', bioDe: 'bd', bioEn: 'be',
      isFeaturedGuest: true,
      availableFrom: new Date('2026-07-05'),
      availableTo: new Date('2026-07-08'),
      instagram: 'alex.ink',
    });
    prisma.artistWork.findMany.mockResolvedValue([]);
    prisma.artistWork.count.mockResolvedValue(0);

    const res = await service.artistPageBySlug('alex', {});

    expect(res.artist.isFeaturedGuest).toBe(true);
    expect(res.artist.availableFrom).toBe('2026-07-05');
    expect(res.artist.availableTo).toBe('2026-07-08');
    expect(res.artist.instagram).toBe('alex.ink');
    // Still gated on ACTIVE + slug.
    expect(prisma.artist.findFirst.mock.calls[0][0].where).toEqual({
      status: ArtistStatus.ACTIVE,
      slug: 'alex',
    });
  });

  it('(b) a non-guest returns isFeaturedGuest:false and null availability/instagram', async () => {
    const { service, prisma } = await createService();
    prisma.artist.findFirst.mockResolvedValue({
      id: 'a2', slug: 'mara', handle: 'mara', displayName: 'Mara',
      avatarUrl: null, coverUrl: null, bio: null, bioDe: null, bioEn: null,
      isFeaturedGuest: false, availableFrom: null, availableTo: null,
      instagram: null,
    });
    prisma.artistWork.findMany.mockResolvedValue([]);
    prisma.artistWork.count.mockResolvedValue(0);

    const res = await service.artistPageBySlug('mara', {});

    expect(res.artist.isFeaturedGuest).toBe(false);
    expect(res.artist.availableFrom).toBeNull();
    expect(res.artist.availableTo).toBeNull();
    expect(res.artist.instagram).toBeNull();
  });
});

describe('PublicArtistsService — lookbook shape unchanged', () => {
  it('(d) never leaks guest fields into lookbook items', async () => {
    const { service, prisma } = await createService();
    prisma.artist.count.mockResolvedValue(1);
    // Row deliberately carries guest fields — the lookbook mapping must drop them.
    prisma.artist.findMany.mockResolvedValue([
      {
        id: 'a1', slug: 'alex', handle: 'alex', displayName: 'Alex',
        avatarUrl: null, coverUrl: null,
        isFeaturedGuest: true, availableFrom: new Date('2026-07-05'),
        availableTo: new Date('2026-07-08'), instagram: 'alex.ink',
      },
    ]);
    prisma.artistWork.count.mockResolvedValue(2);
    prisma.artistWork.findMany.mockResolvedValue([
      { id: 'w1', title: 'T', coverUrl: 'c', tags: [], createdAt: new Date('2026-01-01') },
    ]);

    const res = await service.lookbook({ page: 1, limit: 20 });
    const item = res.items[0];

    expect(Object.keys(item).sort()).toEqual(
      [
        'avatarUrl', 'coverUrl', 'displayName', 'handle', 'id',
        'latestWorks', 'slug', 'worksCount',
      ].sort(),
    );
    expect(item).not.toHaveProperty('isFeaturedGuest');
    expect(item).not.toHaveProperty('availableFrom');
    expect(item).not.toHaveProperty('availableTo');
    expect(item).not.toHaveProperty('instagram');

    // The lookbook DB select must not even request the guest fields.
    const select = prisma.artist.findMany.mock.calls[0][0].select;
    expect(select.isFeaturedGuest).toBeUndefined();
    expect(select.availableFrom).toBeUndefined();
    expect(select.availableTo).toBeUndefined();
    expect(select.instagram).toBeUndefined();
  });
});
