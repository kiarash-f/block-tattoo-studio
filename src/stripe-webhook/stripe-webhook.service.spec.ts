import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GuestBookingStatus, PaymentSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { StripeService } from '../stripe/stripe.service';
import { PaymentsService } from '../payments/payments.service';
import { StripeWebhookService } from './stripe-webhook.service';

const SESSION_ID = 'cs_test_1';

/** A confirmed-eligible guest booking; totalPrice 100 → expected 10000 cents. */
function guestBooking() {
  return {
    id: 'gab_db',
    status: GuestBookingStatus.PENDING_PAYMENT,
    totalPrice: 100,
    email: 'artist@example.com',
    name: 'Alex',
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    endDate: new Date('2026-06-07T00:00:00.000Z'),
    numberOfTables: 1,
    discountApplied: 0,
  };
}

async function createWebhook() {
  // tx client handed to the $transaction callback (so we can assert the flip).
  const tx = {
    guestArtistBooking: { update: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    payment: { findUnique: jest.fn().mockResolvedValue(null) },
    guestArtistBooking: {
      findUnique: jest.fn().mockResolvedValue(guestBooking()),
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  const config = { getOrThrow: jest.fn(() => 'whsec_test') };
  const email = {
    sendGuestArtistBookingConfirmation: jest.fn().mockResolvedValue(undefined),
  };
  const stripe = { constructWebhookEvent: jest.fn() };
  const payments = {
    recordPayment: jest.fn().mockResolvedValue({ id: 'pay_1' }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      StripeWebhookService,
      { provide: ConfigService, useValue: config },
      { provide: PrismaService, useValue: prisma },
      { provide: EmailService, useValue: email },
      { provide: StripeService, useValue: stripe },
      { provide: PaymentsService, useValue: payments },
    ],
  }).compile();

  return {
    service: module.get<StripeWebhookService>(StripeWebhookService),
    prisma,
    email,
    stripe,
    payments,
    tx,
  };
}

/** Wires constructWebhookEvent to return a checkout.session.completed event. */
function stubEvent(
  stripe: { constructWebhookEvent: jest.Mock },
  metadata: Record<string, string>,
  amountTotal = 10000,
) {
  stripe.constructWebhookEvent.mockReturnValue({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: SESSION_ID,
        amount_total: amountTotal,
        payment_intent: 'pi_1',
        metadata,
      },
    },
  });
}

describe('StripeWebhookService — idempotency + routing', () => {
  it('(a) does NOT create a second Payment for a redelivered session', async () => {
    const { service, prisma, payments, email, stripe } = await createWebhook();
    // A Payment already exists for this session id (redelivery).
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay_existing' });
    stubEvent(stripe, {
      payment_source: PaymentSource.GUEST_TABLE,
      target_id: 'gab_1',
      vat_rate_bps: '1900',
    });

    const result = await service.handlePaymentWebhook(
      Buffer.from('{}'),
      'sig',
    );

    expect(result).toEqual({ received: true });
    expect(prisma.payment.findUnique).toHaveBeenCalledWith({
      where: { stripeSessionId: SESSION_ID },
      select: { id: true },
    });
    // No second write, and we never even reached the booking handler.
    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(prisma.guestArtistBooking.findUnique).not.toHaveBeenCalled();
    expect(email.sendGuestArtistBookingConfirmation).not.toHaveBeenCalled();
  });

  it('(b) routes legacy booking_id-only metadata to the GUEST_TABLE handler', async () => {
    const { service, payments, email, tx, stripe } = await createWebhook();
    stubEvent(stripe, { booking_id: 'gab_legacy' });

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    // Atomic confirm happened inside the transaction.
    expect(tx.guestArtistBooking.update).toHaveBeenCalledWith({
      where: { id: 'gab_legacy' },
      data: { status: GuestBookingStatus.CONFIRMED },
    });
    // Exactly one Payment, attached to the guest booking via the legacy id.
    expect(payments.recordPayment).toHaveBeenCalledTimes(1);
    expect(payments.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        source: PaymentSource.GUEST_TABLE,
        guestArtistBookingId: 'gab_legacy',
        stripeSessionId: SESSION_ID,
      }),
      tx,
    );
    expect(email.sendGuestArtistBookingConfirmation).toHaveBeenCalledTimes(1);
  });

  it('(c) routes generic payment_source: GUEST_TABLE metadata correctly', async () => {
    const { service, payments, email, tx, stripe } = await createWebhook();
    stubEvent(stripe, {
      payment_source: PaymentSource.GUEST_TABLE,
      target_id: 'gab_1',
      vat_rate_bps: '1900',
    });

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(tx.guestArtistBooking.update).toHaveBeenCalledWith({
      where: { id: 'gab_1' },
      data: { status: GuestBookingStatus.CONFIRMED },
    });
    expect(payments.recordPayment).toHaveBeenCalledTimes(1);
    expect(payments.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        source: PaymentSource.GUEST_TABLE,
        guestArtistBookingId: 'gab_1',
        stripeSessionId: SESSION_ID,
        vatRateBps: 1900,
      }),
      tx,
    );
    expect(email.sendGuestArtistBookingConfirmation).toHaveBeenCalledTimes(1);
  });
});
