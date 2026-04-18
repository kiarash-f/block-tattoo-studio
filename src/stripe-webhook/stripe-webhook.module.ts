import { Module } from '@nestjs/common';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeModule } from '../stripe/stripe.module';

// EmailService is globally available via EmailModule (@Global)

@Module({
  imports: [StripeModule],
  controllers: [StripeWebhookController],
  providers: [StripeWebhookService, PrismaService],
})
export class StripeWebhookModule {}
