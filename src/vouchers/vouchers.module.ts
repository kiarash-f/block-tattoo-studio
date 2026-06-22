import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TranslationModule } from '../translation/translation.module';
import { StripeModule } from '../stripe/stripe.module';
import { PaymentsModule } from '../payments/payments.module';
import { VoucherProductsService } from './voucher-products.service';
import { VoucherPurchaseService } from './voucher-purchase.service';
import { VoucherSalesService } from './voucher-sales.service';
import { AdminVoucherProductsController } from './admin-voucher-products.controller';
import { PublicVoucherProductsController } from './public-voucher-products.controller';
import { VoucherPurchaseController } from './voucher-purchase.controller';
import { AdminVouchersController } from './admin-vouchers.controller';

@Module({
  imports: [PrismaModule, TranslationModule, StripeModule, PaymentsModule],
  providers: [
    VoucherProductsService,
    VoucherPurchaseService,
    VoucherSalesService,
  ],
  controllers: [
    AdminVoucherProductsController,
    PublicVoucherProductsController,
    VoucherPurchaseController,
    AdminVouchersController,
  ],
})
export class VouchersModule {}
