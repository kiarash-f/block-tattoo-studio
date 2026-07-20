import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as Sentry from '@sentry/nestjs';
import { VoucherDelivery, VoucherStatus, VoucherType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { VoucherSalesService } from './voucher-sales.service';

jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));

async function createService() {
  const prisma = {
    voucherSale: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const email = {
    sendVoucherPurchase: jest.fn().mockResolvedValue(undefined),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoucherSalesService,
      { provide: PrismaService, useValue: prisma },
      { provide: EmailService, useValue: email },
    ],
  }).compile();

  return {
    service: module.get<VoucherSalesService>(VoucherSalesService),
    prisma,
    email,
  };
}

const CODE = 'ABCD-EFGH-JKLM-NPQR';

describe('VoucherSalesService — redeem', () => {
  it('(d) redeems a VALID voucher once, then rejects a second redeem', async () => {
    const { service, prisma } = await createService();

    // First flip matches the VALID row (count 1); the second matches nothing.
    prisma.voucherSale.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    prisma.voucherSale.findUnique
      // findByCode after the successful flip:
      .mockResolvedValueOnce({
        code: CODE,
        status: VoucherStatus.REDEEMED,
        redeemedByAdminId: 'admin_1',
        product: { id: 'vp', type: VoucherType.FULL_DAY, name: 'Full Day' },
        redeemedByAdmin: { id: 'admin_1', email: 'a@x.com', displayName: 'A' },
      })
      // disambiguation read on the second (failed) attempt:
      .mockResolvedValueOnce({ status: VoucherStatus.REDEEMED });

    const first = await service.redeem(CODE, 'admin_1');
    expect(first.status).toBe(VoucherStatus.REDEEMED);

    // The flip is a conditional update guarded on status = VALID.
    expect(prisma.voucherSale.updateMany).toHaveBeenNthCalledWith(1, {
      where: { code: CODE, status: VoucherStatus.VALID },
      data: expect.objectContaining({
        status: VoucherStatus.REDEEMED,
        redeemedByAdminId: 'admin_1',
      }),
    });

    await expect(service.redeem(CODE, 'admin_2')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects redeeming a not-yet-paid voucher', async () => {
    const { service, prisma } = await createService();
    prisma.voucherSale.updateMany.mockResolvedValue({ count: 0 });
    prisma.voucherSale.findUnique.mockResolvedValue({
      status: VoucherStatus.PENDING_PAYMENT,
    });

    await expect(service.redeem(CODE, 'admin_1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects redeeming a cancelled voucher', async () => {
    const { service, prisma } = await createService();
    prisma.voucherSale.updateMany.mockResolvedValue({ count: 0 });
    prisma.voucherSale.findUnique.mockResolvedValue({
      status: VoucherStatus.CANCELLED,
    });

    await expect(service.redeem(CODE, 'admin_1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('404s redeeming an unknown code', async () => {
    const { service, prisma } = await createService();
    prisma.voucherSale.updateMany.mockResolvedValue({ count: 0 });
    prisma.voucherSale.findUnique.mockResolvedValue(null);

    await expect(service.redeem(CODE, 'admin_1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('VoucherSalesService — resendVoucherEmail (M5)', () => {
  beforeEach(() => jest.clearAllMocks());

  function validSale() {
    return {
      id: 'vs_1',
      code: CODE,
      status: VoucherStatus.VALID,
      buyerEmail: 'buyer@example.com',
      buyerName: 'Buyer',
      grossCents: 10000,
      delivery: VoucherDelivery.EMAIL,
      product: { name: 'Full Day' },
    };
  }

  it('re-sends the purchase email for a VALID voucher', async () => {
    const { service, prisma, email } = await createService();
    prisma.voucherSale.findUnique.mockResolvedValue(validSale());

    const result = await service.resendVoucherEmail(CODE);

    expect(email.sendVoucherPurchase).toHaveBeenCalledWith({
      to: 'buyer@example.com',
      buyerName: 'Buyer',
      productName: 'Full Day',
      code: CODE,
      grossCents: 10000,
      delivery: VoucherDelivery.EMAIL,
    });
    expect(result).toEqual({
      sent: true,
      saleId: 'vs_1',
      to: 'buyer@example.com',
    });
  });

  it.each([
    VoucherStatus.PENDING_PAYMENT,
    VoucherStatus.REDEEMED,
    VoucherStatus.CANCELLED,
  ])('rejects resending for a %s voucher and sends nothing', async (status) => {
    const { service, prisma, email } = await createService();
    prisma.voucherSale.findUnique.mockResolvedValue({
      ...validSale(),
      status,
    });

    await expect(service.resendVoucherEmail(CODE)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(email.sendVoucherPurchase).not.toHaveBeenCalled();
  });

  it('404s for an unknown code', async () => {
    const { service, prisma } = await createService();
    prisma.voucherSale.findUnique.mockResolvedValue(null);

    await expect(service.resendVoucherEmail(CODE)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reports a send failure to Sentry and returns 503', async () => {
    const { service, prisma, email } = await createService();
    prisma.voucherSale.findUnique.mockResolvedValue(validSale());
    email.sendVoucherPurchase.mockRejectedValue(new Error('resend down'));

    await expect(service.resendVoucherEmail(CODE)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
