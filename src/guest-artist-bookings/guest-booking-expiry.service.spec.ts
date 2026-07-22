import { Test, TestingModule } from '@nestjs/testing';
import { GuestBookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { GuestBookingExpiryService } from './guest-booking-expiry.service';

async function createService() {
  const prisma = {
    guestArtistBooking: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const stripe = {
    expireCheckoutSession: jest.fn().mockResolvedValue(undefined),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GuestBookingExpiryService,
      { provide: PrismaService, useValue: prisma },
      { provide: StripeService, useValue: stripe },
    ],
  }).compile();

  return {
    service: module.get<GuestBookingExpiryService>(GuestBookingExpiryService),
    prisma,
    stripe,
  };
}

describe('GuestBookingExpiryService — C2: expire bookings AND their sessions', () => {
  it('does nothing when no bookings are stale', async () => {
    const { service, prisma, stripe } = await createService();

    await service.expireStaleBookings();

    expect(prisma.guestArtistBooking.updateMany).not.toHaveBeenCalled();
    expect(stripe.expireCheckoutSession).not.toHaveBeenCalled();
  });

  it('flips stale bookings to EXPIRED and expires their Stripe sessions', async () => {
    const { service, prisma, stripe } = await createService();
    prisma.guestArtistBooking.findMany.mockResolvedValue([
      { id: 'gab_1', stripeSessionId: 'cs_1' },
      { id: 'gab_2', stripeSessionId: 'cs_2' },
    ]);
    prisma.guestArtistBooking.updateMany.mockResolvedValue({ count: 2 });

    await service.expireStaleBookings();

    // Conditional flip: only rows still PENDING_PAYMENT are touched.
    expect(prisma.guestArtistBooking.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['gab_1', 'gab_2'] },
        status: GuestBookingStatus.PENDING_PAYMENT,
      },
      data: { status: GuestBookingStatus.EXPIRED },
    });
    expect(stripe.expireCheckoutSession).toHaveBeenCalledWith('cs_1');
    expect(stripe.expireCheckoutSession).toHaveBeenCalledWith('cs_2');
  });

  it('skips bookings that never got a Stripe session attached', async () => {
    const { service, prisma, stripe } = await createService();
    prisma.guestArtistBooking.findMany.mockResolvedValue([
      { id: 'gab_1', stripeSessionId: null },
    ]);
    prisma.guestArtistBooking.updateMany.mockResolvedValue({ count: 1 });

    await service.expireStaleBookings();

    expect(stripe.expireCheckoutSession).not.toHaveBeenCalled();
  });

  it('tolerates a per-session expire failure (already paid/expired) and continues', async () => {
    const { service, prisma, stripe } = await createService();
    prisma.guestArtistBooking.findMany.mockResolvedValue([
      { id: 'gab_1', stripeSessionId: 'cs_1' },
      { id: 'gab_2', stripeSessionId: 'cs_2' },
    ]);
    prisma.guestArtistBooking.updateMany.mockResolvedValue({ count: 2 });
    stripe.expireCheckoutSession.mockRejectedValueOnce(
      new Error('Session is not open'),
    );

    // Must not throw — the race with a completing payment is benign here.
    await expect(service.expireStaleBookings()).resolves.toBeUndefined();
    // The second session is still expired despite the first failing.
    expect(stripe.expireCheckoutSession).toHaveBeenCalledWith('cs_2');
  });
});
