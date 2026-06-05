import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { StripeService } from '../stripe/stripe.service';
export declare class StripeWebhookService {
    private readonly config;
    private readonly prisma;
    private readonly email;
    private readonly stripe;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService, email: EmailService, stripe: StripeService);
    handlePaymentWebhook(rawBody: Buffer, signature: string): Promise<{
        received: true;
    }>;
}
