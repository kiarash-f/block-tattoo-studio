import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, VoucherTreatment, VoucherType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TranslationService } from '../translation/translation.service';
import { CreateVoucherProductDto } from './dto/create-voucher-product.dto';
import { UpdateVoucherProductDto } from './dto/update-voucher-product.dto';
import { ListVoucherProductsQueryDto } from './dto/list-voucher-products.query.dto';
import { discountedGrossCents } from './voucher-pricing';

/**
 * Admin CRUD for VoucherProduct (the template/batch a sale is issued from).
 * De/En names are auto-translated on write (same pattern as ArticlesService).
 * Pricing/discount rules are enforced here, mirroring the locked design:
 *  - CUSTOM: no fixed price (buyer enters the amount at purchase) and no discount.
 *  - FULL_DAY / HALF_DAY: priceCents required; discount allowed.
 */
@Injectable()
export class VoucherProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly translation: TranslationService,
  ) {}

  /** Translate the base name into the DE/EN paired columns. */
  private async translateName(
    name: string,
  ): Promise<{ nameDe: string; nameEn: string }> {
    const [nameDe, nameEn] = await Promise.all([
      this.translation.translate(name, 'DE'),
      this.translation.translate(name, 'EN-GB'),
    ]);
    return { nameDe, nameEn };
  }

  /**
   * Enforce the type ↔ pricing/discount invariant. `priceCents`/`discountPercent`
   * are the *effective* values (after merging an update onto the existing row).
   */
  private assertPricingRules(
    type: VoucherType,
    priceCents: number | null | undefined,
    discountPercent: number | null | undefined,
  ): void {
    if (type === VoucherType.CUSTOM) {
      if (priceCents != null) {
        throw new BadRequestException(
          'CUSTOM voucher products take no fixed price; the buyer enters the amount at purchase',
        );
      }
      if ((discountPercent ?? 0) > 0) {
        throw new BadRequestException(
          'Discounts cannot be applied to CUSTOM voucher products',
        );
      }
    } else if (priceCents == null) {
      throw new BadRequestException(
        `${type} voucher products require priceCents`,
      );
    }
  }

  /**
   * Only single-purpose vouchers are implemented (VAT taken at sale). The
   * MULTI_PURPOSE enum value is reserved in the schema for a future VAT-at-
   * redemption flow, but no product may be created/updated as multi-purpose yet
   * — allowing it would silently mis-time VAT (taken at sale instead of
   * redemption). `undefined` is fine: it defaults to SINGLE_PURPOSE.
   */
  private assertTreatmentSupported(
    voucherTreatment: VoucherTreatment | undefined,
  ): void {
    if (voucherTreatment === VoucherTreatment.MULTI_PURPOSE) {
      throw new BadRequestException(
        'Multi-purpose vouchers are not yet supported',
      );
    }
  }

  async create(dto: CreateVoucherProductDto) {
    this.assertTreatmentSupported(dto.voucherTreatment);
    this.assertPricingRules(dto.type, dto.priceCents, dto.discountPercent);

    const name = dto.name.trim();
    const product = await this.prisma.voucherProduct.create({
      data: {
        type: dto.type,
        name,
        priceCents: dto.type === VoucherType.CUSTOM ? null : dto.priceCents,
        discountPercent:
          dto.type === VoucherType.CUSTOM ? 0 : (dto.discountPercent ?? 0),
        voucherTreatment: dto.voucherTreatment ?? VoucherTreatment.SINGLE_PURPOSE,
      },
    });

    const translations = await this.translateName(name);
    return this.prisma.voucherProduct.update({
      where: { id: product.id },
      data: translations,
    });
  }

  async list(query: ListVoucherProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.VoucherProductWhereInput = {};
    if (query.type) where.type = query.type;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.voucherProduct.count({ where }),
      this.prisma.voucherProduct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  async findOne(id: string) {
    const product = await this.prisma.voucherProduct.findUnique({
      where: { id },
    });
    if (!product) throw new NotFoundException('Voucher product not found');
    return product;
  }

  /**
   * Public shop listing: active products only, with shop-safe fields plus a
   * computed `finalPriceCents` (the price the buyer actually pays, after the
   * discount — same helper the purchase flow charges with). CUSTOM has no fixed
   * price, so both priceCents and finalPriceCents are null (buyer enters the
   * amount). Admin-only fields (voucherTreatment, isActive, timestamps) are NOT
   * exposed. All De/En variants are returned; the frontend picks the locale.
   */
  async listPublic() {
    const products = await this.prisma.voucherProduct.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        name: true,
        nameDe: true,
        nameEn: true,
        priceCents: true,
        discountPercent: true,
      },
    });

    return products.map((p) => ({
      ...p,
      finalPriceCents:
        p.type === VoucherType.CUSTOM || p.priceCents == null
          ? null
          : discountedGrossCents(p.priceCents, p.discountPercent),
    }));
  }

  async update(id: string, dto: UpdateVoucherProductDto) {
    const existing = await this.findOne(id);

    this.assertTreatmentSupported(dto.voucherTreatment);

    // Validate against the merged (effective) values; `type` is immutable.
    const priceCents =
      dto.priceCents !== undefined ? dto.priceCents : existing.priceCents;
    const discountPercent =
      dto.discountPercent !== undefined
        ? dto.discountPercent
        : existing.discountPercent;
    this.assertPricingRules(existing.type, priceCents, discountPercent);

    const data: Prisma.VoucherProductUpdateInput = {};
    if (dto.priceCents !== undefined) data.priceCents = dto.priceCents;
    if (dto.discountPercent !== undefined)
      data.discountPercent = dto.discountPercent;
    if (dto.voucherTreatment !== undefined)
      data.voucherTreatment = dto.voucherTreatment;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      data.name = name;
      Object.assign(data, await this.translateName(name));
    }

    return this.prisma.voucherProduct.update({ where: { id }, data });
  }
}
