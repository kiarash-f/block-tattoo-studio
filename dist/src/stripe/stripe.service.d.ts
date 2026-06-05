import { ConfigService } from '@nestjs/config';
export interface CreateCheckoutSessionParams {
    guestName: string;
    email: string;
    totalPrice: number;
    bookingId: string;
    numberOfTables: number;
    numberOfDays: number;
    startDate: Date;
    endDate: Date;
}
export declare class StripeService {
    private readonly config;
    private readonly logger;
    private readonly client;
    constructor(config: ConfigService);
    createCheckoutSession(params: CreateCheckoutSessionParams): Promise<{
        sessionId: string;
        paymentUrl: string;
    }>;
    constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): ReturnType<typeof this.client.webhooks.constructEvent>;
}
