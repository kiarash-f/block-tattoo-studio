import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VoucherStatus, VoucherType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VoucherSalesService } from './voucher-sales.service';

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

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoucherSalesService,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();

  return {
    service: module.get<VoucherSalesService>(VoucherSalesService),
    prisma,
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
