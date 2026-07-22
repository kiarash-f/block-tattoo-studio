import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsService } from './payments.service';
import { InvoiceService } from './invoice.service';
import { PaymentsController } from './payments.controller';
import { PaymentsPublicController } from './payments-public.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, PaymentsPublicController],
  providers: [PaymentsService, InvoiceService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
