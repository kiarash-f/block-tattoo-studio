import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceService, InvoiceablePayment } from './invoice.service';

/**
 * Builds an InvoiceService with a mocked Prisma "transaction client" and config.
 * `invoice.create` echoes the data it received so tests read the snapshot off it;
 * `$queryRaw` stands in for the InvoiceCounter allocation and returns a number.
 */
async function createService(studio: Record<string, string> = {}) {
  const config = {
    get: jest.fn((key: string, def?: unknown) => studio[key] ?? def),
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      InvoiceService,
      { provide: PrismaService, useValue: { invoice: { findUnique: jest.fn() } } },
      { provide: ConfigService, useValue: config },
    ],
  }).compile();
  return { service: module.get<InvoiceService>(InvoiceService) };
}

function txMock(opts: {
  lastNumber?: number;
  target?: Record<string, unknown> | null;
}) {
  return {
    $queryRaw: jest.fn(() =>
      Promise.resolve([{ lastNumber: opts.lastNumber ?? 1 }]),
    ),
    invoice: {
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'inv_1', ...data }),
      ),
    },
    bookingRequest: {
      findUnique: jest.fn(() => Promise.resolve(opts.target ?? null)),
    },
    guestArtistBooking: {
      findUnique: jest.fn(() => Promise.resolve(opts.target ?? null)),
    },
    voucherSale: {
      findUnique: jest.fn(() => Promise.resolve(opts.target ?? null)),
    },
  };
}

const basePayment: InvoiceablePayment = {
  id: 'pay_1',
  source: PaymentSource.GUEST_TABLE,
  currency: 'EUR',
  netCents: 8403,
  vatAmountCents: 1597,
  grossCents: 10000,
  vatRateBps: 1900,
  bookingRequestId: null,
  guestArtistBookingId: 'gab_1',
  voucherSaleId: null,
};

describe('InvoiceService — createForPayment', () => {
  it('allocates the number from the DB and zero-pads the display id', async () => {
    const { service } = await createService();
    const tx = txMock({ lastNumber: 42, target: { id: 'gab_1', name: 'G', email: 'g@x' } });

    await service.createForPayment(tx as never, basePayment);

    // The number is never chosen in app code — it comes back from $queryRaw.
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const data = tx.invoice.create.mock.calls[0][0].data;
    const year = new Date().getFullYear(); // Berlin ≈ system year in test env
    expect(data.number).toBe(42);
    expect(data.year).toBeGreaterThanOrEqual(2026);
    expect(data.formattedNumber).toBe(`${data.year}-000042`);
    expect(String(year).length).toBe(4);
  });

  it('snapshots the amounts and studio identity onto the invoice', async () => {
    const { service } = await createService({
      STUDIO_NAME: 'Ink Studio',
      STUDIO_ADDRESS: 'Somestreet 1, Berlin',
      STUDIO_TAX_NUMBER: 'DE123456789',
    });
    const tx = txMock({ target: { id: 'gab_1', name: 'Guest', email: 'guest@x' } });

    await service.createForPayment(tx as never, basePayment);

    const data = tx.invoice.create.mock.calls[0][0].data;
    expect(data.studioName).toBe('Ink Studio');
    expect(data.studioTaxNumber).toBe('DE123456789');
    expect(data.netCents).toBe(8403);
    expect(data.vatAmountCents).toBe(1597);
    expect(data.grossCents).toBe(10000);
    expect(data.vatRateBps).toBe(1900);
    expect(data.paymentId).toBe('pay_1');
  });

  it('captures the guest-table customer snapshot', async () => {
    const { service } = await createService();
    const tx = txMock({
      target: { id: 'gab_1', name: 'Guest Artist', email: 'ga@x.com' },
    });

    await service.createForPayment(tx as never, basePayment);

    const data = tx.invoice.create.mock.calls[0][0].data;
    expect(data.source).toBe(PaymentSource.GUEST_TABLE);
    expect(data.customerName).toBe('Guest Artist');
    expect(data.customerEmail).toBe('ga@x.com');
    expect(data.reference).toBe('gab_1');
  });

  it('degrades to just the reference when the target row is gone (never throws)', async () => {
    const { service } = await createService();
    const tx = txMock({ target: null });

    await service.createForPayment(tx as never, basePayment);

    const data = tx.invoice.create.mock.calls[0][0].data;
    expect(data.customerName).toBeNull();
    expect(data.customerEmail).toBeNull();
    expect(data.reference).toBe('gab_1'); // the payment's target id survives
  });

  it('empty studio tax number is stored as an empty string (surfaced at boot)', async () => {
    const { service } = await createService(); // nothing configured
    const tx = txMock({ target: { id: 'gab_1', name: 'G', email: 'g@x' } });

    await service.createForPayment(tx as never, basePayment);

    expect(tx.invoice.create.mock.calls[0][0].data.studioTaxNumber).toBe('');
  });
});
