import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { STUDIO_TIMEZONE, getZonedYmd } from '../common/time/zoned-date-range';

/**
 * The subset of a freshly-created Payment the invoice snapshot needs. Passed in
 * (rather than re-read) so no extra round-trip happens inside the payment
 * transaction that holds the counter lock.
 */
export interface InvoiceablePayment {
  id: string;
  source: PaymentSource;
  currency: string;
  netCents: number;
  vatAmountCents: number;
  grossCents: number;
  vatRateBps: number;
  bookingRequestId: string | null;
  guestArtistBookingId: string | null;
  voucherSaleId: string | null;
}

const EMPTY_CUSTOMER = { name: null, email: null, reference: null } as const;

/**
 * §14 UStG invoicing. One immutable invoice per PAID payment, created inside the
 * SAME transaction as the payment. Never updates or deletes an invoice — a
 * cancelled payment keeps its invoice (Storno/credit note is deferred; see
 * AUDIT.md §8.3).
 */
@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Create the invoice for a just-written payment. MUST be called with the SAME
   * transaction client that created the payment, so the gap-free number and the
   * invoice commit — or roll back — together with it.
   *
   * Lock discipline: the customer snapshot is read FIRST, then the counter
   * number is allocated as the LAST statement before the insert, so the
   * InvoiceCounter row lock is held for the shortest window before the caller
   * commits. No network I/O runs here (nor anywhere in the payment transaction)
   * — only fast, indexed DB statements.
   */
  async createForPayment(
    tx: Prisma.TransactionClient,
    payment: InvoiceablePayment,
  ): Promise<void> {
    const customer = await this.resolveCustomer(tx, payment);

    const issuedAt = new Date();
    // Year from the Berlin-zoned invoice date, so a payment recorded just after
    // midnight on Jan 1 lands in the correct year's sequence (matches M6).
    const year = Number(getZonedYmd(issuedAt, STUDIO_TIMEZONE).slice(0, 4));

    // Gap-free per-year allocation: the DB computes the next number atomically.
    // ON CONFLICT DO UPDATE takes the counter row lock, so concurrent payments
    // serialize on it; a caller that rolls back returns its number to the pool
    // (the +1 is undone with the transaction) — no gap, even across a year
    // boundary. The number is never chosen in app code.
    const rows = await tx.$queryRaw<{ lastNumber: number }[]>(Prisma.sql`
      INSERT INTO "InvoiceCounter" ("year", "lastNumber", "updatedAt")
      VALUES (${year}, 1, NOW())
      ON CONFLICT ("year")
      DO UPDATE SET "lastNumber" = "InvoiceCounter"."lastNumber" + 1,
                    "updatedAt" = NOW()
      RETURNING "lastNumber";
    `);
    const number = Number(rows[0].lastNumber);
    const formattedNumber = `${year}-${String(number).padStart(6, '0')}`;

    await tx.invoice.create({
      data: {
        year,
        number,
        formattedNumber,
        issuedAt,
        ...this.studioIdentity(),
        currency: payment.currency,
        netCents: payment.netCents,
        vatAmountCents: payment.vatAmountCents,
        grossCents: payment.grossCents,
        vatRateBps: payment.vatRateBps,
        customerName: customer.name,
        customerEmail: customer.email,
        source: payment.source,
        reference: customer.reference,
        paymentId: payment.id,
      },
    });
  }

  /** Fetch the invoice snapshot for a payment (admin endpoint). Null if none. */
  async getByPaymentId(paymentId: string) {
    return this.prisma.invoice.findUnique({ where: { paymentId } });
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  /**
   * Studio identity for the §14 header, snapshotted from config at issue time.
   * name/address/taxNumber are stored as (possibly empty) strings; a blank tax
   * number is surfaced loudly at boot (main.ts) rather than blocked here.
   */
  private studioIdentity(): {
    studioName: string;
    studioAddress: string;
    studioTaxNumber: string;
    studioPhone: string | null;
    studioWebsite: string | null;
  } {
    const optional = (v: string | undefined) => (v && v.trim() ? v : null);
    return {
      studioName: this.config.get<string>('STUDIO_NAME') ?? 'Tattoo Studio',
      studioAddress: this.config.get<string>('STUDIO_ADDRESS') ?? '',
      studioTaxNumber: this.config.get<string>('STUDIO_TAX_NUMBER') ?? '',
      studioPhone: optional(this.config.get<string>('STUDIO_PHONE')),
      studioWebsite: optional(this.config.get<string>('STUDIO_WEBSITE')),
    };
  }

  /**
   * Best-available recipient snapshot for the invoice, resolved from the payment
   * target via the transaction client. A missing target row degrades to just the
   * reference id (never throws — the payment already exists and must be invoiced).
   */
  private async resolveCustomer(
    tx: Prisma.TransactionClient,
    payment: InvoiceablePayment,
  ): Promise<{
    name: string | null;
    email: string | null;
    reference: string | null;
  }> {
    switch (payment.source) {
      case PaymentSource.TATTOO: {
        if (!payment.bookingRequestId) return { ...EMPTY_CUSTOMER };
        const b = await tx.bookingRequest.findUnique({
          where: { id: payment.bookingRequestId },
          select: {
            id: true,
            client: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        });
        if (!b?.client)
          return {
            name: null,
            email: null,
            reference: b?.id ?? payment.bookingRequestId,
          };
        return {
          name: `${b.client.firstName} ${b.client.lastName}`.trim() || null,
          email: b.client.email,
          reference: b.id,
        };
      }
      case PaymentSource.GUEST_TABLE: {
        if (!payment.guestArtistBookingId) return { ...EMPTY_CUSTOMER };
        const g = await tx.guestArtistBooking.findUnique({
          where: { id: payment.guestArtistBookingId },
          select: { id: true, name: true, email: true },
        });
        if (!g)
          return {
            name: null,
            email: null,
            reference: payment.guestArtistBookingId,
          };
        return { name: g.name, email: g.email, reference: g.id };
      }
      case PaymentSource.VOUCHER: {
        if (!payment.voucherSaleId) return { ...EMPTY_CUSTOMER };
        const v = await tx.voucherSale.findUnique({
          where: { id: payment.voucherSaleId },
          select: { id: true, buyerName: true, buyerEmail: true },
        });
        if (!v)
          return { name: null, email: null, reference: payment.voucherSaleId };
        return { name: v.buyerName, email: v.buyerEmail, reference: v.id };
      }
      default:
        return { ...EMPTY_CUSTOMER };
    }
  }
}
