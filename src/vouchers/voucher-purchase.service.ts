import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentSource,
  Prisma,
  VoucherDelivery,
  VoucherStatus,
  VoucherType,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { PaymentsService } from '../payments/payments.service';
import {
  CreateVoucherPurchaseDto,
  VOUCHER_CUSTOM_MIN_CENTS,
} from './dto/create-voucher-purchase.dto';
import { discountedGrossCents } from './voucher-pricing';

// Unambiguous code alphabet (no 0/O/1/I). 32 chars divides 256 evenly, so
// `byte % 32` is bias-free.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_BYTES = 16; // → 16 chars, ~80 bits of entropy

@Injectable()
export class VoucherPurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly payments: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Public purchase entry point. Validates the product (and a CUSTOM amount),
   * computes the discounted gross + VAT split, creates the VoucherSale row
   * (PENDING_PAYMENT, with a unique code) BEFORE the checkout session, then opens
   * a Stripe session tagged payment_source = VOUCHER / target_id = sale.id. The
   * webhook (Step 6) flips the sale to VALID and emails the code once paid.
   */
  async purchase(dto: CreateVoucherPurchaseDto) {
    const product = await this.prisma.voucherProduct.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Voucher product not found');

    const grossCents = this.resolveGrossCents(product, dto.amountCents);
    const delivery = dto.delivery ?? VoucherDelivery.EMAIL;
    this.assertDeliveryComplete(delivery, dto);

    // VAT split — snapshotted onto the sale from the same source as Payment.
    const vatRateBps = this.config.get<number>('VAT_RATE_BPS', 1900);
    const { netCents, vatAmountCents } = this.payments.computeVatSplit(
      grossCents,
      vatRateBps,
    );

    const sale = await this.createSaleWithUniqueCode({
      productId: product.id,
      status: VoucherStatus.PENDING_PAYMENT,
      voucherTreatment: product.voucherTreatment, // snapshot
      buyerName: dto.buyerName.trim(),
      buyerEmail: dto.buyerEmail.trim(),
      delivery,
      ...(delivery === VoucherDelivery.EMAIL_AND_POST
        ? {
            shippingName: dto.shippingName?.trim(),
            shippingLine1: dto.shippingLine1?.trim(),
            shippingLine2: dto.shippingLine2?.trim() || null,
            shippingPostalCode: dto.shippingPostalCode?.trim(),
            shippingCity: dto.shippingCity?.trim(),
            shippingCountry: dto.shippingCountry?.trim(),
          }
        : {}),
      grossCents,
      netCents,
      vatAmountCents,
      vatRateBps,
    });

    // ── Stripe checkout session (generic; webhook routes by payment_source) ────
    const baseUrl = this.config.getOrThrow<string>('PUBLIC_BASE_URL');
    const { paymentUrl } = await this.stripe.createCheckoutSession({
      paymentSource: PaymentSource.VOUCHER,
      targetId: sale.id,
      vatRateBps,
      amountCents: grossCents,
      email: sale.buyerEmail,
      productName: product.name,
      productDescription: 'Gift voucher',
      successUrl: `${baseUrl}/vouchers/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/vouchers/cancelled`,
    });

    // The code is intentionally NOT returned here — it's delivered by email only
    // after payment is confirmed (the sale is still PENDING_PAYMENT).
    return {
      sale: { id: sale.id, status: sale.status, grossCents: sale.grossCents },
      stripePaymentUrl: paymentUrl,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Resolve the gross the buyer pays, enforcing the type ↔ amount rules. */
  private resolveGrossCents(
    product: { type: VoucherType; priceCents: number | null; discountPercent: number },
    amountCents: number | undefined,
  ): number {
    if (product.type === VoucherType.CUSTOM) {
      if (amountCents == null) {
        throw new BadRequestException(
          'amountCents is required for a CUSTOM voucher',
        );
      }
      if (!Number.isInteger(amountCents) || amountCents < VOUCHER_CUSTOM_MIN_CENTS) {
        throw new BadRequestException(
          `Custom voucher amount must be at least ${VOUCHER_CUSTOM_MIN_CENTS} cents (€${VOUCHER_CUSTOM_MIN_CENTS / 100})`,
        );
      }
      return amountCents;
    }

    // FULL_DAY / HALF_DAY
    if (amountCents != null) {
      throw new BadRequestException(
        'amountCents is only allowed for CUSTOM voucher products',
      );
    }
    if (product.priceCents == null) {
      // Product invariant guarantees a price here; never trust it blindly.
      throw new BadRequestException('Voucher product has no price configured');
    }
    return discountedGrossCents(product.priceCents, product.discountPercent);
  }

  /** Postal delivery requires a usable address. */
  private assertDeliveryComplete(
    delivery: VoucherDelivery,
    dto: CreateVoucherPurchaseDto,
  ): void {
    if (delivery !== VoucherDelivery.EMAIL_AND_POST) return;
    const required: [string, string | undefined][] = [
      ['shippingName', dto.shippingName],
      ['shippingLine1', dto.shippingLine1],
      ['shippingPostalCode', dto.shippingPostalCode],
      ['shippingCity', dto.shippingCity],
      ['shippingCountry', dto.shippingCountry],
    ];
    const missing = required.filter(([, v]) => !v?.trim()).map(([k]) => k);
    if (missing.length) {
      throw new BadRequestException(
        `Postal delivery requires: ${missing.join(', ')}`,
      );
    }
  }

  /** crypto-random, unguessable, human-readable code: XXXX-XXXX-XXXX-XXXX. */
  private generateCode(): string {
    const bytes = crypto.randomBytes(CODE_BYTES);
    let out = '';
    for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
    return out.match(/.{1,4}/g)!.join('-');
  }

  /**
   * Create the sale, regenerating the code on the (astronomically unlikely)
   * unique-collision so a purchase never fails on a code clash.
   */
  private async createSaleWithUniqueCode(
    data: Omit<Prisma.VoucherSaleUncheckedCreateInput, 'code'>,
  ) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prisma.voucherSale.create({
          data: { ...data, code: this.generateCode() },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          continue; // code collision — try a fresh code
        }
        throw err;
      }
    }
    throw new InternalServerErrorException(
      'Could not generate a unique voucher code',
    );
  }
}
