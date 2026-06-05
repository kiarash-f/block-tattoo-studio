import { StripeWebhookService } from './stripe-webhook.service';
interface RawRequest {
    rawBody?: Buffer;
    headers: Record<string, string | string[] | undefined>;
}
export declare class StripeWebhookController {
    private readonly service;
    constructor(service: StripeWebhookService);
    payment(req: RawRequest): Promise<{
        received: true;
    }>;
}
export {};
