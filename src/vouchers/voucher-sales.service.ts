import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Prisma, VoucherStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { ListVoucherSalesQueryDto } from './dto/list-voucher-sales.query.dto';

/**
 * Admin operations over issued vouchers (VoucherSale): list, lookup-by-code
 * (the QR-scan flow), and redeem. Redemption is a standalone status flip — it
 * writes NO Payment (money was taken once, at sale).
 */
@Injectable()
export class VoucherSalesService {
  private readonly logger = new Logger(VoucherSalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async list(query: ListVoucherSalesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.VoucherSaleWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.type) where.product = { is: { type: query.type } };

    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { buyerEmail: { contains: q, mode: 'insensitive' } },
        { buyerName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.voucherSale.count({ where }),
      this.prisma.voucherSale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          product: { select: { id: true, type: true, name: true } },
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  /** Lookup by code — the scan flow reads this before confirming a redeem. */
  async findByCode(code: string) {
    const sale = await this.prisma.voucherSale.findUnique({
      where: { code },
      include: {
        product: { select: { id: true, type: true, name: true } },
        redeemedByAdmin: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
    if (!sale) throw new NotFoundException('Voucher not found');
    return sale;
  }

  /**
   * Re-send the voucher purchase email for a paid sale (M5 recovery path —
   * the code is delivered by email only, so a failed send leaves a paying
   * customer with nothing). Only VALID sales qualify: PENDING_PAYMENT would
   * leak an unpaid code, CANCELLED/REDEEMED have nothing to deliver. Unlike
   * the webhook's fire-and-forget send, this one is awaited so the admin sees
   * the failure immediately.
   */
  async resendVoucherEmail(code: string) {
    const sale = await this.prisma.voucherSale.findUnique({
      where: { code },
      include: { product: { select: { name: true } } },
    });
    if (!sale) throw new NotFoundException('Voucher not found');
    if (sale.status !== VoucherStatus.VALID) {
      throw new BadRequestException(
        `Voucher email can only be resent for a VALID voucher (current status: ${sale.status})`,
      );
    }

    try {
      await this.email.sendVoucherPurchase({
        to: sale.buyerEmail,
        buyerName: sale.buyerName,
        productName: sale.product.name,
        code: sale.code,
        grossCents: sale.grossCents,
        delivery: sale.delivery,
      });
    } catch (err) {
      this.logger.error(
        `Failed to resend voucher email for sale ${sale.id}`,
        err,
      );
      Sentry.captureException(err, {
        level: 'error',
        tags: { area: 'email' },
        extra: { voucherSaleId: sale.id, trigger: 'admin resend' },
      });
      throw new ServiceUnavailableException(
        'Sending the voucher email failed — try again or check the email provider',
      );
    }

    return { sent: true, saleId: sale.id, to: sale.buyerEmail };
  }

  /**
   * Redeem a voucher: VALID → REDEEMED, stamping who/when. The flip is an atomic
   * conditional update (where status = VALID), so concurrent scans can never
   * double-redeem — the losing call matches 0 rows. No Payment is written.
   */
  async redeem(code: string, adminId: string) {
    const result = await this.prisma.voucherSale.updateMany({
      where: { code, status: VoucherStatus.VALID },
      data: {
        status: VoucherStatus.REDEEMED,
        redeemedAt: new Date(),
        redeemedByAdminId: adminId,
      },
    });

    if (result.count === 0) {
      // Nothing flipped — disambiguate for a precise admin-facing message.
      const sale = await this.prisma.voucherSale.findUnique({
        where: { code },
        select: { status: true },
      });
      if (!sale) throw new NotFoundException('Voucher not found');
      if (sale.status === VoucherStatus.REDEEMED) {
        throw new ConflictException('Voucher already redeemed');
      }
      if (sale.status === VoucherStatus.CANCELLED) {
        throw new BadRequestException(
          'Voucher is cancelled and cannot be redeemed',
        );
      }
      // PENDING_PAYMENT
      throw new BadRequestException(
        'Voucher is not paid yet and cannot be redeemed',
      );
    }

    return this.findByCode(code);
  }
}
