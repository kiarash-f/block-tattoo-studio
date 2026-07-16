import { BadRequestException } from '@nestjs/common';
import { BudgetRange as PrismaBudgetRange } from '@prisma/client';
import { BookingsController } from './bookings.controller';
import type { BookingsService } from './bookings.service';

// The walk-in endpoint is multipart, so it bypasses the DTO ValidationPipe and
// validates/maps fields by hand in the controller. These tests focus on the
// budgetRange mapping: the frontend sends DTO-style values ("_200_400") that
// must be translated to the Prisma enum ("B200_400") before reaching the DB.

function makeController() {
  const bookings = {
    createWalkIn: jest.fn().mockResolvedValue({ bookingId: 'b1' }),
  };
  const controller = new BookingsController(
    bookings as unknown as BookingsService,
  );
  return { controller, bookings };
}

/** Minimal valid multipart body; budgetRange is layered on per-test. */
function baseBody(overrides: Record<string, string> = {}) {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    description: 'Small linework piece',
    artistId: 'artist_1',
    tattooDate: '2026-07-20T14:00:00.000Z',
    ...overrides,
  } as Record<string, string>;
}

const req = { user: { sub: 'admin_1' } } as any;
const files = {} as { images?: Express.Multer.File[] };

/** The data object the controller forwards to bookings.createWalkIn(). */
function forwardedData(bookings: { createWalkIn: jest.Mock }) {
  return bookings.createWalkIn.mock.calls[0][1];
}

describe('BookingsController — createWalkIn budgetRange mapping', () => {
  it('(a) maps a bracketed DTO value "_200_400" to Prisma "B200_400" before the service call', async () => {
    const { controller, bookings } = makeController();

    await controller.createWalkIn(
      baseBody({ budgetRange: '_200_400' }),
      req,
      files,
    );

    expect(bookings.createWalkIn).toHaveBeenCalledTimes(1);
    expect(forwardedData(bookings).budgetRange).toBe(
      PrismaBudgetRange.B200_400,
    );
    expect(forwardedData(bookings).budgetRange).toBe('B200_400');
  });

  it('(b) throws BadRequestException on a garbage value and never reaches the service', () => {
    const { controller, bookings } = makeController();

    expect(() =>
      controller.createWalkIn(
        baseBody({ budgetRange: 'not_a_range' }),
        req,
        files,
      ),
    ).toThrow(BadRequestException);
    expect(bookings.createWalkIn).not.toHaveBeenCalled();
  });

  it('(c) omitting budgetRange forwards undefined, preserving the service UNDER_200 default', async () => {
    const { controller, bookings } = makeController();

    await controller.createWalkIn(baseBody(), req, files);

    expect(bookings.createWalkIn).toHaveBeenCalledTimes(1);
    expect(forwardedData(bookings).budgetRange).toBeUndefined();
  });

  it('(c2) an empty-string budgetRange is treated as omitted (forwards undefined)', async () => {
    const { controller, bookings } = makeController();

    await controller.createWalkIn(baseBody({ budgetRange: '' }), req, files);

    expect(forwardedData(bookings).budgetRange).toBeUndefined();
  });

  it('(d) an edge value spelled identically on both sides ("UNDER_200") maps through unchanged', async () => {
    const { controller, bookings } = makeController();

    await controller.createWalkIn(
      baseBody({ budgetRange: 'UNDER_200' }),
      req,
      files,
    );

    expect(forwardedData(bookings).budgetRange).toBe(
      PrismaBudgetRange.UNDER_200,
    );
  });
});
