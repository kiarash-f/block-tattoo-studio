import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VoucherTreatment, VoucherType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { VoucherProductsService } from './voucher-products.service';

/**
 * VoucherProductsService with mocked Prisma + Translation. `create` echoes its
 * `data`; `update` merges the translation patch; `translate` tags the text with
 * its target lang so the De/En wiring is observable.
 */
async function createService() {
  const prisma = {
    voucherProduct: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'vp_test', ...data }),
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => Promise.resolve({ id: where.id, ...data })),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const translation = {
    translate: jest.fn((text: string, lang: string) =>
      Promise.resolve(`${text} [${lang}]`),
    ),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      VoucherProductsService,
      { provide: PrismaService, useValue: prisma },
      { provide: TranslationService, useValue: translation },
    ],
  }).compile();

  return {
    service: module.get<VoucherProductsService>(VoucherProductsService),
    prisma,
    translation,
  };
}

function createdProduct(prisma: {
  voucherProduct: { create: jest.Mock };
}): Record<string, any> {
  return prisma.voucherProduct.create.mock.calls[0][0].data;
}

describe('VoucherProductsService — pricing/discount rules', () => {
  it('(b) rejects a discount on a CUSTOM product', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.create({
        type: VoucherType.CUSTOM,
        name: 'Custom',
        discountPercent: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucherProduct.create).not.toHaveBeenCalled();
  });

  it('rejects a price on a CUSTOM product', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.create({
        type: VoucherType.CUSTOM,
        name: 'Custom',
        priceCents: 10000,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucherProduct.create).not.toHaveBeenCalled();
  });

  it('rejects a FULL_DAY product with no price', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.create({ type: VoucherType.FULL_DAY, name: 'Full Day' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucherProduct.create).not.toHaveBeenCalled();
  });

  it('rejects setting a discount on a CUSTOM product via update', async () => {
    const { service, prisma } = await createService();
    prisma.voucherProduct.findUnique.mockResolvedValue({
      id: 'vp_c',
      type: VoucherType.CUSTOM,
      priceCents: null,
      discountPercent: 0,
    });
    await expect(
      service.update('vp_c', { discountPercent: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucherProduct.update).not.toHaveBeenCalled();
  });

  it('creates a FULL_DAY product with price + discount and auto-translates the name', async () => {
    const { service, prisma, translation } = await createService();

    const result = await service.create({
      type: VoucherType.FULL_DAY,
      name: 'Full Day of Work',
      priceCents: 50000,
      discountPercent: 20,
    });

    expect(prisma.voucherProduct.create).toHaveBeenCalledTimes(1);
    const data = createdProduct(prisma);
    expect(data.priceCents).toBe(50000);
    expect(data.discountPercent).toBe(20);

    expect(translation.translate).toHaveBeenCalledWith('Full Day of Work', 'DE');
    expect(translation.translate).toHaveBeenCalledWith(
      'Full Day of Work',
      'EN-GB',
    );
    expect(result.nameDe).toBe('Full Day of Work [DE]');
    expect(result.nameEn).toBe('Full Day of Work [EN-GB]');
  });

  it('creates a CUSTOM product with no price and zero discount', async () => {
    const { service, prisma } = await createService();
    await service.create({ type: VoucherType.CUSTOM, name: 'Custom Amount' });
    const data = createdProduct(prisma);
    expect(data.priceCents).toBeNull();
    expect(data.discountPercent).toBe(0);
  });
});

describe('VoucherProductsService — multi-purpose guard', () => {
  it('(a) rejects creating a MULTI_PURPOSE product', async () => {
    const { service, prisma } = await createService();
    await expect(
      service.create({
        type: VoucherType.FULL_DAY,
        name: 'Full Day',
        priceCents: 50000,
        voucherTreatment: VoucherTreatment.MULTI_PURPOSE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucherProduct.create).not.toHaveBeenCalled();
  });

  it('(a) rejects updating a product to MULTI_PURPOSE', async () => {
    const { service, prisma } = await createService();
    prisma.voucherProduct.findUnique.mockResolvedValue({
      id: 'vp_1',
      type: VoucherType.FULL_DAY,
      priceCents: 50000,
      discountPercent: 0,
    });
    await expect(
      service.update('vp_1', {
        voucherTreatment: VoucherTreatment.MULTI_PURPOSE,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.voucherProduct.update).not.toHaveBeenCalled();
  });

  it('still allows an explicit SINGLE_PURPOSE create', async () => {
    const { service, prisma } = await createService();
    await service.create({
      type: VoucherType.FULL_DAY,
      name: 'Full Day',
      priceCents: 50000,
      voucherTreatment: VoucherTreatment.SINGLE_PURPOSE,
    });
    expect(prisma.voucherProduct.create).toHaveBeenCalledTimes(1);
  });
});

describe('VoucherProductsService — public listing', () => {
  it('(b) queries active-only and never selects admin fields', async () => {
    const { service, prisma } = await createService();
    prisma.voucherProduct.findMany.mockResolvedValue([]);

    await service.listPublic();

    const arg = prisma.voucherProduct.findMany.mock.calls[0][0];
    // Inactive products are excluded at the query — never fetched.
    expect(arg.where).toEqual({ isActive: true });
    // Admin-only fields are not exposed.
    expect(arg.select.voucherTreatment).toBeUndefined();
    expect(arg.select.isActive).toBeUndefined();
    expect(arg.select.createdAt).toBeUndefined();
    expect(arg.select.updatedAt).toBeUndefined();
  });

  it('(c) computes finalPriceCents: discounted for fixed-price, null for CUSTOM', async () => {
    const { service, prisma } = await createService();
    prisma.voucherProduct.findMany.mockResolvedValue([
      { id: 'p1', type: VoucherType.FULL_DAY, name: 'Full Day', nameDe: 'DE', nameEn: 'EN', priceCents: 50000, discountPercent: 20 },
      { id: 'p2', type: VoucherType.HALF_DAY, name: 'Half Day', nameDe: 'DE', nameEn: 'EN', priceCents: 25000, discountPercent: 0 },
      { id: 'p3', type: VoucherType.FULL_DAY, name: 'Edge', nameDe: 'DE', nameEn: 'EN', priceCents: 150, discountPercent: 15 },
      { id: 'p4', type: VoucherType.CUSTOM, name: 'Custom', nameDe: 'DE', nameEn: 'EN', priceCents: null, discountPercent: 0 },
    ]);

    const items = await service.listPublic();

    expect(items).toEqual([
      expect.objectContaining({ id: 'p1', finalPriceCents: 40000 }),
      expect.objectContaining({ id: 'p2', finalPriceCents: 25000 }),
      expect.objectContaining({ id: 'p3', finalPriceCents: 128 }), // 127.5 → half-up
      expect.objectContaining({ id: 'p4', priceCents: null, finalPriceCents: null }),
    ]);
  });
});
