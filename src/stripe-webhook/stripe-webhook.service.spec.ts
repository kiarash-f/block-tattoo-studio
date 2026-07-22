import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';
import {
  GuestBookingStatus,
  PaymentSource,
  VoucherDelivery,
  VoucherStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { StripeService } from '../stripe/stripe.service';
import { PaymentsService } from '../payments/payments.service';
import { StripeWebhookService } from './stripe-webhook.service';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

const SESSION_ID = 'cs_test_1';

/** A confirmed-eligible guest booking; totalPriceCents 10000 = €100. */
function guestBooking() {
  return {
    id: 'gab_db',
    status: GuestBookingStatus.PENDING_PAYMENT,
    totalPriceCents: 10000,
    email: 'artist@example.com',
    name: 'Alex',
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    endDate: new Date('2026-06-07T00:00:00.000Z'),
    numberOfTables: 1,
    discountApplied: 0,
  };
}

/** A payable voucher sale; grossCents 10000 = €100. */
function voucherSale() {
  return {
    id: 'vs_db',
    status: VoucherStatus.PENDING_PAYMENT,
    code: 'ABCD-EFGH-JKLM-NPQR',
    buyerEmail: 'buyer@example.com',
    buyerName: 'Buyer',
    grossCents: 10000,
    delivery: VoucherDelivery.EMAIL,
    product: { name: 'Full Day' },
  };
}

async function createWebhook() {
  // tx client handed to the $transaction callback (so we can assert the flip).
  const tx = {
    guestArtistBooking: { update: jest.fn().mockResolvedValue({}) },
    voucherSale: { update: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    payment: { findUnique: jest.fn().mockResolvedValue(null) },
    guestArtistBooking: {
      findUnique: jest.fn().mockResolvedValue(guestBooking()),
      update: jest.fn().mockResolvedValue({}),
    },
    voucherSale: {
      findUnique: jest.fn().mockResolvedValue(voucherSale()),
    },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  const config = { getOrThrow: jest.fn(() => 'whsec_test') };
  const email = {
    sendGuestArtistBookingConfirmation: jest.fn().mockResolvedValue(undefined),
    sendVoucherPurchase: jest.fn().mockResolvedValue(undefined),
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
  amountTotal: number | null = 10000,
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

const GUEST_META = {
  payment_source: PaymentSource.GUEST_TABLE,
  target_id: 'gab_db',
  vat_rate_bps: '1900',
};
const VOUCHER_META = {
  payment_source: PaymentSource.VOUCHER,
  target_id: 'vs_db',
  vat_rate_bps: '1900',
};

beforeEach(() => jest.clearAllMocks());

describe('StripeWebhookService — idempotency + routing', () => {
  it('(a) does NOT create a second Payment for a redelivered session (and does not Sentry)', async () => {
    const { service, prisma, payments, email, stripe } = await createWebhook();
    // A Payment already exists for this session id (redelivery).
    prisma.payment.findUnique.mockResolvedValue({ id: 'pay_existing' });
    stubEvent(stripe, GUEST_META);

    const result = await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(prisma.payment.findUnique).toHaveBeenCalledWith({
      where: { stripeSessionId: SESSION_ID },
      select: { id: true },
    });
    // No second write, and we never even reached the booking handler.
    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(prisma.guestArtistBooking.findUnique).not.toHaveBeenCalled();
    expect(email.sendGuestArtistBookingConfirmation).not.toHaveBeenCalled();
    // Money IS recorded — a redelivery is not an alert.
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('(b) routes legacy booking_id-only metadata to the GUEST_TABLE handler', async () => {
    const { service, prisma, payments, email, tx, stripe } =
      await createWebhook();
    prisma.guestArtistBooking.findUnique.mockResolvedValue({
      ...guestBooking(),
      id: 'gab_legacy',
    });
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
    stubEvent(stripe, GUEST_META);

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(tx.guestArtistBooking.update).toHaveBeenCalledWith({
      where: { id: 'gab_db' },
      data: { status: GuestBookingStatus.CONFIRMED },
    });
    expect(payments.recordPayment).toHaveBeenCalledTimes(1);
    expect(payments.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        source: PaymentSource.GUEST_TABLE,
        guestArtistBookingId: 'gab_db',
        stripeSessionId: SESSION_ID,
        vatRateBps: 1900,
      }),
      tx,
    );
    expect(email.sendGuestArtistBookingConfirmation).toHaveBeenCalledTimes(1);
    // Amount matched exactly (integer cents) — no alert.
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('rejects a bad signature with 401 (Stripe must retry those)', async () => {
    const { service, stripe } = await createWebhook();
    stripe.constructWebhookEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    await expect(
      service.handlePaymentWebhook(Buffer.from('{}'), 'sig'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('StripeWebhookService — C2: money received but no Payment written', () => {
  it('Sentries a completed session with no routing metadata', async () => {
    const { service, payments, stripe } = await createWebhook();
    stubEvent(stripe, {});

    const result = await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('Sentries a completed session with null amount_total', async () => {
    const { service, payments, stripe } = await createWebhook();
    stubEvent(stripe, GUEST_META, null);

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('Sentries an unknown payment_source', async () => {
    const { service, payments, stripe } = await createWebhook();
    stubEvent(stripe, {
      payment_source: 'NOT_A_SOURCE',
      target_id: 'x_1',
    });

    const result = await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('Sentries a paid session whose guest booking no longer exists', async () => {
    const { service, prisma, payments, stripe } = await createWebhook();
    prisma.guestArtistBooking.findUnique.mockResolvedValue(null);
    stubEvent(stripe, GUEST_META);

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('Sentries the expiry race: payment lands on an EXPIRED booking', async () => {
    const { service, prisma, payments, email, stripe } = await createWebhook();
    prisma.guestArtistBooking.findUnique.mockResolvedValue({
      ...guestBooking(),
      status: GuestBookingStatus.EXPIRED,
    });
    stubEvent(stripe, GUEST_META);

    const result = await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(prisma.guestArtistBooking.update).not.toHaveBeenCalled();
    expect(email.sendGuestArtistBookingConfirmation).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('Sentries a paid session whose voucher sale no longer exists', async () => {
    const { service, prisma, payments, stripe } = await createWebhook();
    prisma.voucherSale.findUnique.mockResolvedValue(null);
    stubEvent(stripe, VOUCHER_META);

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('Sentries a payment for an already-VALID voucher sale', async () => {
    const { service, prisma, payments, email, stripe } = await createWebhook();
    prisma.voucherSale.findUnique.mockResolvedValue({
      ...voucherSale(),
      status: VoucherStatus.VALID,
    });
    stubEvent(stripe, VOUCHER_META);

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(email.sendVoucherPurchase).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});

describe('StripeWebhookService — amount validation (integer cents, H2)', () => {
  it('guest mismatch: confirms + emails but skips the Payment, with Sentry (M4: pre-decision behavior)', async () => {
    const { service, prisma, payments, email, tx, stripe } =
      await createWebhook();
    // Booking expects 10000; Stripe charged 9999.
    stubEvent(stripe, GUEST_META, 9999);

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    // Confirm happens OUTSIDE the payment transaction on this branch.
    expect(prisma.guestArtistBooking.update).toHaveBeenCalledWith({
      where: { id: 'gab_db' },
      data: { status: GuestBookingStatus.CONFIRMED },
    });
    expect(tx.guestArtistBooking.update).not.toHaveBeenCalled();
    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(email.sendGuestArtistBookingConfirmation).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('guest match compares against totalPriceCents directly (no float round-trip)', async () => {
    const { service, prisma, payments, stripe } = await createWebhook();
    // A price that would break under float math: €80.10 * 3 = 240.30 → 24030.
    prisma.guestArtistBooking.findUnique.mockResolvedValue({
      ...guestBooking(),
      totalPriceCents: 24030,
    });
    stubEvent(stripe, GUEST_META, 24030);

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(payments.recordPayment).toHaveBeenCalledTimes(1);
    expect(payments.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({ grossCents: 24030 }),
      expect.anything(),
    );
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('voucher mismatch: sale NOT activated, no Payment, no email, Sentry', async () => {
    const { service, payments, email, tx, stripe } = await createWebhook();
    stubEvent(stripe, VOUCHER_META, 9999);

    const result = await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(tx.voucherSale.update).not.toHaveBeenCalled();
    expect(payments.recordPayment).not.toHaveBeenCalled();
    expect(email.sendVoucherPurchase).not.toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('voucher match: activates the sale, records the Payment, emails the code', async () => {
    const { service, payments, email, tx, stripe } = await createWebhook();
    stubEvent(stripe, VOUCHER_META, 10000);

    await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(tx.voucherSale.update).toHaveBeenCalledWith({
      where: { id: 'vs_db' },
      data: { status: VoucherStatus.VALID },
    });
    expect(payments.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        source: PaymentSource.VOUCHER,
        voucherSaleId: 'vs_db',
        grossCents: 10000,
      }),
      tx,
    );
    expect(email.sendVoucherPurchase).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe('StripeWebhookService — M11: verified-but-unprocessable events ack with 200', () => {
  it('NaN vat_rate_bps: recordPayment throws, event is acked + Sentried, not bounced', async () => {
    const { service, payments, stripe } = await createWebhook();
    payments.recordPayment.mockRejectedValue(
      new BadRequestException('vatRateBps must be a non-negative integer'),
    );
    stubEvent(stripe, { ...GUEST_META, vat_rate_bps: 'not-a-number' });

    // Must NOT throw — a 4xx/5xx would make Stripe retry an immutable event.
    const result = await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('unexpected handler throw: acked + Sentried, not bounced', async () => {
    const { service, prisma, stripe } = await createWebhook();
    prisma.guestArtistBooking.findUnique.mockRejectedValue(
      new Error('db exploded'),
    );
    stubEvent(stripe, GUEST_META);

    const result = await service.handlePaymentWebhook(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
