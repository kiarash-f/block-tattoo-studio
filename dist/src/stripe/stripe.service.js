"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
let StripeService = StripeService_1 = class StripeService {
    config;
    logger = new common_1.Logger(StripeService_1.name);
    client;
    constructor(config) {
        this.config = config;
        this.client = new stripe_1.default(this.config.getOrThrow('STRIPE_SECRET_KEY'), { apiVersion: '2026-03-25.dahlia' });
    }
    async createCheckoutSession(params) {
        const { email, totalPrice, bookingId, numberOfTables, numberOfDays, startDate, endDate, } = params;
        const fmt = (d) => d.toISOString().slice(0, 10);
        const session = await this.client.checkout.sessions.create({
            mode: 'payment',
            customer_email: email,
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: 'eur',
                        unit_amount: Math.round(totalPrice * 100),
                        product_data: {
                            name: 'Guest Artist Table Booking',
                            description: `${numberOfTables} table(s) · ${numberOfDays} day(s) · ` +
                                `${fmt(startDate)} to ${fmt(endDate)}`,
                        },
                    },
                },
            ],
            metadata: { booking_id: bookingId },
            success_url: `${this.config.getOrThrow('PUBLIC_BASE_URL')}/guest-booking/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${this.config.getOrThrow('PUBLIC_BASE_URL')}/guest-booking/cancelled`,
        });
        if (!session.url) {
            this.logger.error(`Stripe session created but has no URL: ${session.id}`);
            throw new Error('Stripe checkout session URL is missing');
        }
        return {
            sessionId: session.id,
            paymentUrl: session.url,
        };
    }
    constructWebhookEvent(rawBody, signature, secret) {
        return this.client.webhooks.constructEvent(rawBody, signature, secret);
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map