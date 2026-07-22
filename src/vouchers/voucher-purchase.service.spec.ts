import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentSource, VoucherStatus, VoucherType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { PaymentsService } from '../payments/payments.service';
import { InvoiceService } from '../payments/invoice.service';
import { VoucherPurchaseService } from './voucher-purchase.service';

/**
 * Builds a VoucherPurchaseService with mocked Prisma + Stripe + Config, and the
 * REAL PaymentsService so the VAT split is exercised end-to-end (not re-stated).
 * `voucherSale.create` echoes the `data` it received so tests can read the
 * frozen gross/net/VAT straight off the create call.
 */
async function createService() {
  const prisma = {
    voucherProduct: { findUnique: jest.fn() },
    voucherSale: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'vs_test', ...data }),
      ),
    },
  };
  const stripe = {
    createCheckoutSession: jest
      .fn()
      .mockResolvedValue({ sessionId: 'cs_1', paymentUrl: 'https://pay' }),
  };
  const config = {
    get: jest.fn((key: string, def?: unknown) =>
      key === 'VAT_RATE_BPS' ? 1900 : def,
    ),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'PUBLIC_BASE_URL') return 'https://app.test';
      throw new Error(`missing ${key}`);
    }),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoucherPurchaseService,
      PaymentsService,
      InvoiceService,
      { provide: PrismaService, useValue: prisma },
      { provide: StripeService, useValue: stripe },
      { provide: ConfigService, useValue: config },
    ],
  }).compile();

  return {
    service: module.get<VoucherPurchaseService>(VoucherPurchaseService),
    prisma,
    stripe,
  };
}

function fullDayProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'vp_1',
    type: VoucherType.FULL_DAY,
    name: 'Full Day of Work',
    priceCents: 10000,
    discountPercent: 0,
    voucherTreatment: 'SINGLE_PURPOSE',
    ...overrides,
  };
}

function customProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'vp_c',
    type: VoucherType.CUSTOM,
    name: 'Custom Amount',
    priceCents: null,
    discountPercent: 0,
    voucherTreatment: 'SINGLE_PURPOSE',
    ...overrides,
  };
}

const buyer = { buyerName: 'Jane', buyerEmail: 'jane@x.com' };

/** Read the `data` passed to voucherSale.create on its first call. */
function createdSale(prisma: {
  voucherSale: { create: jest.Mock };
}): Record<string, any> {
  return prisma.voucherSale.create.mock.calls[0][0].data;
}

describe('VoucherPurchaseService — discount math + VAT split', () => {
  // [priceCents, discountPercent, expectedGross]. The €1.50 @ 15% case lands on
  // a half-cent (127.5) and must round HALF-UP to 128.
  it.each([
    [10000, 0, 10000],
    [10000, 15, 8500],
    [50000, 20, 40000],
    [150, 15, 128],
  ])(
    'FULL_DAY price=%i discount=%i%% → gross=%i, and net+vat reconciles',
    async (priceCents, discountPercent, expectedGross) => {
      const { service, prisma } = await createService();
      prisma.voucherProduct.findUnique.mockResolvedValue(
        fullDayProduct({ priceCents, discountPercent }),
      );

      await service.purchase({ productId: 'vp_1', ...buyer });

      const data = createdSale(prisma);
      expect(data.grossCents).toBe(expectedGross);

      const expectedNet = Math.round(expectedGross / 1.19);
      expect(data.netCents).toBe(expectedNet);
      expect(data.vatAmountCents).toBe(expectedGross - expectedNet);
      // The invariant: the split always reconciles off the discounted gross.
      expect(data.netCents + data.vatAmountCents).toBe(data.grossCents);
      expect(data.vatRateBps).toBe(1900);
      expect(data.status).toBe(VoucherStatus.PENDING_PAYMENT);
    },
  );

  it('opens a VOUCHER checkout tagged with the sale id; code is not leaked pre-payment', async () => {
    const { service, prisma, stripe } = await createService();
    prisma.voucherProduct.findUnique.mockResolvedValue(fullDayProduct());

    const res = await service.purchase({ productId: 'vp_1', ...buyer });

    expect(stripe.createCheckoutSession).toHaveBeenCalledTimes(1);
    const arg = stripe.createCheckoutSession.mock.calls[0][0];
    expect(arg.paymentSource).toBe(PaymentSource.VOUCHER);
    expect(arg.targetId).toBe('vs_test');
    expect(arg.amountCents).toBe(10000);
    expect(res.stripePaymentUrl).toBe('https://pay');
    // The raw code must not come back in the purchase response.
    expect(res.sale).not.toHaveProperty('code');
  });
});

describe('VoucherPurchaseService — custom amount validation', () => {
  it('(c) rejects a custom amount below €100 (10000 cents)', async () => {
    const { service, prisma, stripe } = await createService();
    prisma.voucherProduct.findUnique.mockResolvedValue(customProduct());

    await expect(
      service.purchase({ productId: 'vp_c', amountCents: 9999, ...buyer }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.voucherSale.create).not.toHaveBeenCalled();
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('rejects a custom purchase with no amount', async () => {
    const { service, prisma } = await createService();
    prisma.voucherProduct.findUnique.mockResolvedValue(customProduct());

    await expect(
      service.purchase({ productId: 'vp_c', ...buyer }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucherSale.create).not.toHaveBeenCalled();
  });

  it('accepts a custom amount at exactly €100 (no discount)', async () => {
    const { service, prisma } = await createService();
    prisma.voucherProduct.findUnique.mockResolvedValue(customProduct());

    await service.purchase({ productId: 'vp_c', amountCents: 10000, ...buyer });

    expect(createdSale(prisma).grossCents).toBe(10000);
  });

  it('rejects amountCents on a non-custom product', async () => {
    const { service, prisma } = await createService();
    prisma.voucherProduct.findUnique.mockResolvedValue(fullDayProduct());

    await expect(
      service.purchase({ productId: 'vp_1', amountCents: 12000, ...buyer }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucherSale.create).not.toHaveBeenCalled();
  });

  it('404s an unknown product', async () => {
    const { service, prisma } = await createService();
    prisma.voucherProduct.findUnique.mockResolvedValue(null);

    await expect(
      service.purchase({ productId: 'nope', ...buyer }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.voucherSale.create).not.toHaveBeenCalled();
  });
});

describe('VoucherPurchaseService — H7 multi-purpose block', () => {
  it('hard-blocks the SALE of a MULTI_PURPOSE product (defence-in-depth)', async () => {
    const { service, prisma, stripe } = await createService();
    // A product that somehow reached MULTI_PURPOSE (creation is already blocked
    // elsewhere) must still never be sold — VAT timing is not yet handled.
    prisma.voucherProduct.findUnique.mockResolvedValue(
      fullDayProduct({ voucherTreatment: 'MULTI_PURPOSE' }),
    );

    await expect(
      service.purchase({ productId: 'vp_1', ...buyer }),
    ).rejects.toBeInstanceOf(BadRequestException);

    // No sale row, no checkout session — the block is before both.
    expect(prisma.voucherSale.create).not.toHaveBeenCalled();
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });
});
