import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ScheduleTattooDto } from './bookings.controller';

/** Validate a payload and return only the errors on `agreedPriceCents`. */
function priceErrors(agreedPriceCents: unknown) {
  const dto = plainToInstance(ScheduleTattooDto, {
    scheduledDate: '2026-07-01T10:00:00.000Z',
    artistId: 'artist_1',
    ...(agreedPriceCents === undefined ? {} : { agreedPriceCents }),
  });
  return validateSync(dto).filter((e) => e.property === 'agreedPriceCents');
}

describe('ScheduleTattooDto — agreedPriceCents validation', () => {
  it('accepts a positive integer', () => {
    expect(priceErrors(25000)).toHaveLength(0);
  });

  it('accepts omission (optional)', () => {
    expect(priceErrors(undefined)).toHaveLength(0);
  });

  it('rejects zero', () => {
    expect(priceErrors(0).length).toBeGreaterThan(0);
  });

  it('rejects a negative amount', () => {
    expect(priceErrors(-5).length).toBeGreaterThan(0);
  });

  it('rejects a non-integer', () => {
    expect(priceErrors(100.5).length).toBeGreaterThan(0);
  });
});
