import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentMethod,
  PaymentSource,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceService } from './invoice.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments.query.dto';
import {
  STUDIO_TIMEZONE,
  getUtcRangeForZonedDate,
} from '../common/time/zoned-date-range';

/**
 * Input for recording a realized payment. Used by BOTH paths:
 *  - LINK  → called by the Stripe webhook once money is received
 *  - CASH  → called by an admin action
 * Both converge to a single Payment row (status PAID); the only differences are
 * `method`, the stripe* fields, and `createdByAdminId`.
 */
export interface RecordPaymentInput {
  source: PaymentSource;
  method: PaymentMethod;

  /** Gross amount the customer paid, in integer cents. */
  grossCents: number;

  // ─── Target (exactly one must be set, and must agree with `source`) ──────────
  bookingRequestId?: string; // source = TATTOO
  guestArtistBookingId?: string; // source = GUEST_TABLE
  voucherSaleId?: string; // source = VOUCHER

  /**
   * Applied VAT rate in basis points. For LINK payments the webhook passes the
   * rate snapshotted at checkout creation (metadata.vat_rate_bps); when omitted
   * (e.g. cash) the configured default rate is used.
   */
  vatRateBps?: number;

  paidAt?: Date; // defaults to now
  currency?: string; // defaults to 'EUR'

  // Stripe linkage (LINK only)
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;

  createdByAdminId?: string; // CASH only; null/undefined for webhook-created
  note?: string;

  /** CASH only — client-supplied double-submit key; unique when present (M2). */
  cashIdempotencyKey?: string;
}

@Injectable()
export class PaymentsService {
  private readonly defaultVatRateBps: number;
  /** Earliest plausible paidAt for a cash payment (§8.3b). UTC midnight of go-live. */
  private readonly goLiveDate: Date;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly invoices: InvoiceService,
  ) {
    this.defaultVatRateBps = this.config.get<number>('VAT_RATE_BPS', 1900);
    this.goLiveDate = new Date(
      `${this.config.get<string>('PAYMENTS_GO_LIVE_DATE', '2026-07-22')}T00:00:00.000Z`,
    );
  }

  /**
   * GoBD (§8.3b): keep a cash payment's paidAt plausible. Reject a date in the
   * future (with a small clock-skew allowance) or before the studio went live —
   * either would make the books implausible. Only the cash path can set paidAt;
   * the webhook always stamps now(), so it is never bounded here.
   */
  private assertPaidAtInBounds(paidAt: Date): void {
    if (Number.isNaN(paidAt.getTime())) {
      throw new BadRequestException('paidAt is not a valid date');
    }
    const SKEW_MS = 5 * 60 * 1000; // tolerate minor client/server clock drift
    if (paidAt.getTime() > Date.now() + SKEW_MS) {
      throw new BadRequestException('paidAt cannot be in the future');
    }
    if (paidAt.getTime() < this.goLiveDate.getTime()) {
      throw new BadRequestException(
        `paidAt cannot be before go-live (${this.goLiveDate.toISOString().slice(0, 10)})`,
      );
    }
  }

  /**
   * Compute the gross/net/VAT split from a gross amount and a rate in basis
   * points. net is rounded half-up; VAT absorbs the rounding remainder so the
   * three values always reconcile (net + vat === gross). Public so other money
   * flows (e.g. voucher sales) snapshot their split from the same source.
   */
  public computeVatSplit(
    grossCents: number,
    vatRateBps: number,
  ): { netCents: number; vatAmountCents: number } {
    const netCents = Math.round(grossCents / (1 + vatRateBps / 10_000));
    const vatAmountCents = grossCents - netCents;
    return { netCents, vatAmountCents };
  }

  /**
   * Enforce, at app level, the same invariant as the DB CHECK constraint
   * (Payment_target_source_chk): exactly one target FK is set and it agrees
   * with `source`. VOUCHER currently has no FK column, so VOUCHER payments are
   * rejected until the voucherSaleId seam lands.
   */
  private assertTargetMatchesSource(input: {
    source: PaymentSource;
    bookingRequestId?: string;
    guestArtistBookingId?: string;
    voucherSaleId?: string;
  }): void {
    const { source, bookingRequestId, guestArtistBookingId, voucherSaleId } =
      input;

    switch (source) {
      case PaymentSource.TATTOO:
        if (!bookingRequestId)
          throw new BadRequestException(
            'TATTOO payment requires bookingRequestId',
          );
        if (guestArtistBookingId || voucherSaleId)
          throw new BadRequestException(
            'TATTOO payment must not set guestArtistBookingId or voucherSaleId',
          );
        break;

      case PaymentSource.GUEST_TABLE:
        if (!guestArtistBookingId)
          throw new BadRequestException(
            'GUEST_TABLE payment requires guestArtistBookingId',
          );
        if (bookingRequestId || voucherSaleId)
          throw new BadRequestException(
            'GUEST_TABLE payment must not set bookingRequestId or voucherSaleId',
          );
        break;

      case PaymentSource.VOUCHER:
        if (!voucherSaleId)
          throw new BadRequestException(
            'VOUCHER payment requires voucherSaleId',
          );
        if (bookingRequestId || guestArtistBookingId)
          throw new BadRequestException(
            'VOUCHER payment must not set bookingRequestId or guestArtistBookingId',
          );
        break;

      default:
        throw new BadRequestException(`Unknown payment source: ${String(source)}`);
    }
  }

  /**
   * Verify the payment's target row actually exists before writing, so a bad id
   * surfaces as a clean 404 rather than an FK violation. Assumes the invariant
   * (source ↔ which FK is set) has already been checked.
   */
  private async assertTargetExists(input: {
    source: PaymentSource;
    bookingRequestId?: string;
    guestArtistBookingId?: string;
    voucherSaleId?: string;
  }): Promise<void> {
    if (input.source === PaymentSource.TATTOO) {
      const exists = await this.prisma.bookingRequest.findUnique({
        where: { id: input.bookingRequestId },
        select: { id: true },
      });
      if (!exists)
        throw new NotFoundException(
          `BookingRequest ${input.bookingRequestId} not found`,
        );
    } else if (input.source === PaymentSource.GUEST_TABLE) {
      const exists = await this.prisma.guestArtistBooking.findUnique({
        where: { id: input.guestArtistBookingId },
        select: { id: true },
      });
      if (!exists)
        throw new NotFoundException(
          `GuestArtistBooking ${input.guestArtistBookingId} not found`,
        );
    } else if (input.source === PaymentSource.VOUCHER) {
      const exists = await this.prisma.voucherSale.findUnique({
        where: { id: input.voucherSaleId },
        select: { id: true },
      });
      if (!exists)
        throw new NotFoundException(
          `VoucherSale ${input.voucherSaleId} not found`,
        );
    }
  }

  /**
   * Admin-initiated cash payment. Fixes method = CASH, status = PAID (default),
   * stamps createdByAdminId, and validates both the invariant and that the
   * target exists before delegating to recordPayment.
   *
   * When the caller supplies an idempotency key, a repeat submission (double
   * click, retried request, flaky connection) returns the payment created the
   * first time rather than a second PAID row inflating revenue (M2). The
   * returned `idempotentReplay` flag tells the caller which happened.
   */
  async createCashPayment(dto: CreatePaymentDto, adminId: string) {
    const target = {
      source: dto.source,
      bookingRequestId: dto.bookingRequestId,
      guestArtistBookingId: dto.guestArtistBookingId,
    };

    this.assertTargetMatchesSource(target);
    await this.assertTargetExists(target);

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : undefined;
    if (paidAt) this.assertPaidAtInBounds(paidAt);

    let payment: Awaited<ReturnType<typeof this.recordPayment>>;
    let idempotentReplay = false;

    try {
      payment = await this.recordPayment({
        source: dto.source,
        method: PaymentMethod.CASH,
        grossCents: dto.grossCents,
        bookingRequestId: dto.bookingRequestId,
        guestArtistBookingId: dto.guestArtistBookingId,
        paidAt,
        note: dto.note,
        createdByAdminId: adminId,
        cashIdempotencyKey: dto.idempotencyKey,
      });
    } catch (err) {
      // The unique index is the arbiter, not a pre-read: two simultaneous
      // submissions of the same key both attempt the insert and Postgres lets
      // exactly one win. The loser lands here and adopts the winner's row.
      const existing = await this.findByCashIdempotencyKey(err, dto);
      if (!existing) throw err;
      payment = existing;
      idempotentReplay = true;
    }

    // Soft over-payment signal for priced tattoo bookings (never blocks).
    const overPayment = dto.bookingRequestId
      ? await this.checkOverPayment(dto.bookingRequestId)
      : { overPaymentWarning: false, overageCents: 0 };

    return { payment, idempotentReplay, ...overPayment };
  }

  /**
   * Resolve a create failure to the already-recorded payment when — and only
   * when — it is a unique violation on `cashIdempotencyKey` and a key was
   * actually supplied. Any other error (including a P2002 on a different
   * column) returns null so the caller rethrows it untouched.
   */
  private async findByCashIdempotencyKey(err: unknown, dto: CreatePaymentDto) {
    if (!dto.idempotencyKey) return null;
    if (
      !(err instanceof Prisma.PrismaClientKnownRequestError) ||
      err.code !== 'P2002'
    ) {
      return null;
    }
    const targetFields = err.meta?.target;
    const hitCashKey = Array.isArray(targetFields)
      ? targetFields.includes('cashIdempotencyKey')
      : typeof targetFields === 'string' &&
        targetFields.includes('cashIdempotencyKey');
    if (!hitCashKey) return null;

    return this.prisma.payment.findUnique({
      where: { cashIdempotencyKey: dto.idempotencyKey },
    });
  }

  /**
   * Mark a PAID payment as CANCELLED (the studio's "no-longer-counting" action;
   * the owner handles any actual refund in cash). A CANCELLED row is excluded
   * from revenue analytics and from booking balance — both filter status = PAID —
   * so nothing else needs to change for it to drop out of totals.
   *
   * Only PAID → CANCELLED is allowed; an already-CANCELLED or REFUNDED payment is
   * rejected. An optional reason is appended to the note for audit.
   */
  async cancelPayment(id: string, adminId: string, reason?: string) {
    const trimmedReason = reason?.trim() || null;

    // The status flip is the guard: an atomic conditional update matching only
    // a still-PAID row, so of two concurrent cancels exactly one flips it. The
    // loser matches 0 rows and cannot overwrite the winner's cancelledAt /
    // cancelledByAdminId / cancellationReason (M1) — same pattern as voucher
    // redeem. The read-then-compose of `note` is gone entirely (GoBD §8.3): the
    // reason goes in its own set-once `cancellationReason` field and the
    // original `note` is never rewritten.
    const result = await this.prisma.payment.updateMany({
      where: { id, status: PaymentStatus.PAID },
      data: {
        status: PaymentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledByAdminId: adminId,
        cancellationReason: trimmedReason,
      },
    });

    if (result.count === 0) {
      // Nothing flipped — re-read to disambiguate for a precise admin message.
      const current = await this.prisma.payment.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!current) throw new NotFoundException(`Payment ${id} not found`);
      if (current.status === PaymentStatus.CANCELLED) {
        throw new ConflictException(`Payment ${id} is already cancelled`);
      }
      throw new BadRequestException(
        `Only a PAID payment can be cancelled (current status: ${current.status})`,
      );
    }

    return this.prisma.payment.findUniqueOrThrow({ where: { id } });
  }

  /**
   * Create a single Payment row (status PAID) AND its §14 UStG invoice, in one
   * atomic unit. Shared by the cash and link paths, so every realized payment —
   * whatever the source — gets exactly one gap-free invoice. Idempotency on
   * stripeSessionId is enforced by the unique index and guarded upstream by the
   * webhook; this method only records the payment + invoice.
   *
   * Pass `tx` to enlist this write in a caller's interactive transaction (e.g.
   * the webhook flips the booking + records the payment atomically). When no `tx`
   * is passed (cash), we open our own so the payment and invoice still commit or
   * roll back together — the invoice number depends on it. The caller's
   * transaction must contain NO network I/O (Stripe/email) — the invoice
   * allocation holds a counter row lock until commit.
   */
  async recordPayment(input: RecordPaymentInput, tx?: Prisma.TransactionClient) {
    if (!Number.isInteger(input.grossCents) || input.grossCents <= 0) {
      throw new BadRequestException(
        'grossCents must be a positive integer (cents)',
      );
    }

    this.assertTargetMatchesSource(input);

    const vatRateBps = input.vatRateBps ?? this.defaultVatRateBps;
    if (!Number.isInteger(vatRateBps) || vatRateBps < 0) {
      throw new BadRequestException('vatRateBps must be a non-negative integer');
    }

    const { netCents, vatAmountCents } = this.computeVatSplit(
      input.grossCents,
      vatRateBps,
    );

    const write = async (db: Prisma.TransactionClient) => {
      const payment = await db.payment.create({
        data: {
          source: input.source,
          method: input.method,
          // status defaults to PAID
          currency: input.currency ?? 'EUR',
          grossCents: input.grossCents,
          netCents,
          vatAmountCents,
          vatRateBps,
          paidAt: input.paidAt ?? new Date(),
          bookingRequestId: input.bookingRequestId ?? null,
          guestArtistBookingId: input.guestArtistBookingId ?? null,
          voucherSaleId: input.voucherSaleId ?? null,
          stripeSessionId: input.stripeSessionId ?? null,
          stripePaymentIntentId: input.stripePaymentIntentId ?? null,
          stripeChargeId: input.stripeChargeId ?? null,
          createdByAdminId: input.createdByAdminId ?? null,
          note: input.note ?? null,
          cashIdempotencyKey: input.cashIdempotencyKey ?? null,
        },
      });

      // Same transaction: a PAID payment always has exactly one invoice, and the
      // gap-free number rolls back with the payment if the commit fails.
      await this.invoices.createForPayment(db, payment);

      return payment;
    };

    return tx ? write(tx) : this.prisma.$transaction((db) => write(db));
  }

  // ─── Public status lookup ───────────────────────────────────────────────────

  /**
   * Public, read-only check of whether a checkout session's payment has been
   * recorded. Reads our own DB (the webhook is the source of truth) — never
   * calls Stripe. Unknown and not-yet-processed session ids both read as
   * PENDING by design; the frontend disambiguates by polling timeout, so this
   * never throws 404. Returns only { status, context } — no amount/customer.
   */
  async getPublicStatusBySessionId(sessionId: string): Promise<{
    status: 'PAID' | 'PENDING';
    context: PaymentSource | null;
  }> {
    const payment = await this.prisma.payment.findUnique({
      where: { stripeSessionId: sessionId },
      select: { source: true },
    });

    return payment
      ? { status: 'PAID', context: payment.source }
      : { status: 'PENDING', context: null };
  }

  // ─── Balance (computed fresh, never stored) ─────────────────────────────────

  /**
   * Money actually kept for a booking: SUM(grossCents) of PAID rows minus the
   * SUM(refundedAmountCents) recorded on those same rows (partial refunds).
   * Fully-refunded payments are status REFUNDED and excluded entirely.
   * Single indexed aggregate on (bookingRequestId, status).
   */
  async sumPaidCentsForBooking(
    bookingRequestId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const db = tx ?? this.prisma;
    const agg = await db.payment.aggregate({
      where: { bookingRequestId, status: PaymentStatus.PAID },
      _sum: { grossCents: true, refundedAmountCents: true },
    });
    const gross = agg._sum.grossCents ?? 0;
    const refunded = agg._sum.refundedAmountCents ?? 0;
    return gross - refunded;
  }

  /**
   * Pure combiner: derive remaining + fullyPaid from a booking's agreed price
   * (null = not priced yet) and its paid total. `remainingCents` is null when
   * unpriced. `fullyPaid` is true once a priced booking is paid in full
   * (remaining <= 0; <= rather than === so an over-payment still reads as paid).
   */
  computeBalance(
    agreedPriceCents: number | null,
    paidCents: number,
  ): {
    agreedPriceCents: number | null;
    paidCents: number;
    remainingCents: number | null;
    fullyPaid: boolean;
  } {
    const remainingCents =
      agreedPriceCents === null ? null : agreedPriceCents - paidCents;
    const fullyPaid = remainingCents !== null && remainingCents <= 0;
    return { agreedPriceCents, paidCents, remainingCents, fullyPaid };
  }

  /** Load a booking's agreed price and compute its full balance summary. */
  async getBookingBalance(bookingRequestId: string) {
    const booking = await this.prisma.bookingRequest.findUnique({
      where: { id: bookingRequestId },
      select: { agreedPriceCents: true },
    });
    if (!booking) {
      throw new NotFoundException(
        `BookingRequest ${bookingRequestId} not found`,
      );
    }
    const paidCents = await this.sumPaidCentsForBooking(bookingRequestId);
    return this.computeBalance(booking.agreedPriceCents, paidCents);
  }

  /**
   * Soft over-payment check for a tattoo booking, run AFTER a payment is
   * recorded (so the running total includes it). Returns a warning + overage
   * when a priced booking's paid total exceeds its agreed price. Never blocks —
   * over-payment is allowed by design. Reusable by the cash endpoint and the
   * future TATTOO link path.
   */
  async checkOverPayment(
    bookingRequestId: string,
  ): Promise<{ overPaymentWarning: boolean; overageCents: number }> {
    const balance = await this.getBookingBalance(bookingRequestId);
    // remainingCents is null when unpriced (can't over-pay an unpriced booking).
    if (balance.remainingCents !== null && balance.remainingCents < 0) {
      return { overPaymentWarning: true, overageCents: -balance.remainingCents };
    }
    return { overPaymentWarning: false, overageCents: 0 };
  }

  // ─── Admin payments list ────────────────────────────────────────────────────

  /**
   * Paginated, filtered list of payments (admin). Matches the project's list
   * convention: $transaction([count, findMany]) → { total, page, limit, items }.
   * `from`/`to` are inclusive whole-day bounds in UTC ([from 00:00, to+1 00:00)).
   * Includes both target relations + createdByAdmin so callers can resolve
   * per-payment context (see normalize step).
   */
  async list(query: ListPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};
    if (query.source) where.source = query.source;
    if (query.method) where.method = query.method;
    if (query.status) where.status = query.status;

    if (query.from || query.to) {
      // Berlin-day bounds, matching revenue analytics so the same from/to
      // returns the same rows in both admin views (M6). `to` is fully included
      // via the exclusive next-day-start end. YYYY-MM-DD is enforced by the DTO.
      const paidAt: Prisma.DateTimeFilter = {};
      if (query.from) {
        // slice(0,10): DTO allows full ISO; the filter is a calendar-day bound.
        paidAt.gte = getUtcRangeForZonedDate(
          query.from.slice(0, 10),
          STUDIO_TIMEZONE,
        ).startUtc;
      }
      if (query.to) {
        paidAt.lt = getUtcRangeForZonedDate(
          query.to.slice(0, 10),
          STUDIO_TIMEZONE,
        ).endUtc;
      }
      where.paidAt = paidAt;
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        skip,
        take: limit,
        include: {
          bookingRequest: {
            select: {
              id: true,
              client: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
          guestArtistBooking: {
            select: { id: true, name: true, email: true },
          },
          voucherSale: {
            select: { id: true, code: true, buyerName: true, buyerEmail: true },
          },
          createdByAdmin: {
            select: { id: true, email: true, displayName: true },
          },
        },
      }),
    ]);

    const items = rows.map((p) => ({
      id: p.id,
      source: p.source,
      method: p.method,
      status: p.status,
      currency: p.currency,
      grossCents: p.grossCents,
      netCents: p.netCents,
      vatAmountCents: p.vatAmountCents,
      vatRateBps: p.vatRateBps,
      paidAt: p.paidAt,
      note: p.note,
      refundedAt: p.refundedAt,
      refundedAmountCents: p.refundedAmountCents,
      createdByAdmin: p.createdByAdmin,
      // Source-agnostic context resolved server-side; the client never switches
      // on `source` to read who/what a payment was for.
      context: this.resolvePaymentContext(p),
    }));

    return { total, page, limit, items };
  }

  /**
   * Resolve a consistent { source, customerName, customerEmail, reference }
   * for a payment by switching on its source:
   *  - TATTOO      → the booking's client
   *  - GUEST_TABLE → the inline guest-artist-booking fields
   *  - VOUCHER     → placeholder (voucher sales don't exist yet)
   * `reference` is the target record id (paired with `source` for deep-linking).
   */
  private resolvePaymentContext(p: {
    source: PaymentSource;
    bookingRequest: {
      id: string;
      client: { firstName: string; lastName: string; email: string | null };
    } | null;
    guestArtistBooking: { id: string; name: string; email: string } | null;
    voucherSale: {
      id: string;
      code: string;
      buyerName: string;
      buyerEmail: string;
    } | null;
  }): {
    source: PaymentSource;
    customerName: string | null;
    customerEmail: string | null;
    reference: string | null;
  } {
    let customerName: string | null = null;
    let customerEmail: string | null = null;
    let reference: string | null = null;

    switch (p.source) {
      case PaymentSource.TATTOO:
        if (p.bookingRequest) {
          customerName =
            `${p.bookingRequest.client.firstName} ${p.bookingRequest.client.lastName}`.trim();
          customerEmail = p.bookingRequest.client.email;
          reference = p.bookingRequest.id;
        }
        break;
      case PaymentSource.GUEST_TABLE:
        if (p.guestArtistBooking) {
          customerName = p.guestArtistBooking.name;
          customerEmail = p.guestArtistBooking.email;
          reference = p.guestArtistBooking.id;
        }
        break;
      case PaymentSource.VOUCHER:
        if (p.voucherSale) {
          customerName = p.voucherSale.buyerName;
          customerEmail = p.voucherSale.buyerEmail;
          reference = p.voucherSale.id;
        }
        break;
    }

    return { source: p.source, customerName, customerEmail, reference };
  }
}
