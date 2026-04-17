import { Module } from '@nestjs/common';
import { ShopifyWebhookController } from './shopify-webhook.controller';
import { ShopifyWebhookService } from './shopify-webhook.service';
import { PrismaService } from '../prisma/prisma.service';

// EmailService is globally available via EmailModule (@Global)

@Module({
  controllers: [ShopifyWebhookController],
  providers: [ShopifyWebhookService, PrismaService],
})
export class ShopifyWebhookModule {}
