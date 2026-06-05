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
var StripeWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeWebhookService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const stripe_service_1 = require("../stripe/stripe.service");
let StripeWebhookService = StripeWebhookService_1 = class StripeWebhookService {
    config;
    prisma;
    email;
    stripe;
    logger = new common_1.Logger(StripeWebhookService_1.name);
    constructor(config, prisma, email, stripe) {
        this.config = config;
        this.prisma = prisma;
        this.email = email;
        this.stripe = stripe;
    }
    async handlePaymentWebhook(rawBody, signature) {
        const secret = this.config.getOrThrow('STRIPE_WEBHOOK_SECRET');
        let event;
        try {
            event = this.stripe.constructWebhookEvent(rawBody, signature, secret);
        }
        catch {
            this.logger.warn('Stripe webhook signature verification failed');
            throw new common_1.UnauthorizedException('Invalid webhook signature');
        }
        if (event.type !== 'checkout.session.completed') {
            return { received: true };
        }
        const session = event.data.object;
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) {
            this.logger.warn(`Stripe webhook: checkout.session.completed has no booking_id metadata (session: ${session.id})`);
            return { received: true };
        }
        const booking = await this.prisma.guestArtistBooking.findUnique({
            where: { id: bookingId },
        });
        if (!booking) {
            this.logger.warn(`Stripe webhook: booking ${bookingId} not found — skipping`);
            return { received: true };
        }
        if (booking.status !== client_1.GuestBookingStatus.PENDING_PAYMENT) {
            this.logger.log(`Stripe webhook: booking ${bookingId} already in status ${booking.status} — skipping`);
            return { received: true };
        }
        await this.prisma.guestArtistBooking.update({
            where: { id: bookingId },
            data: { status: client_1.GuestBookingStatus.CONFIRMED },
        });
        this.logger.log(`Booking ${bookingId} confirmed via Stripe webhook`);
        const numberOfDays = Math.round((booking.endDate.getTime() - booking.startDate.getTime()) / 86_400_000) + 1;
        this.email
            .sendGuestArtistBookingConfirmation({
            to: booking.email,
            artistName: booking.name,
            startDate: booking.startDate,
            endDate: booking.endDate,
            numberOfTables: booking.numberOfTables,
            numberOfDays,
            totalPrice: booking.totalPrice,
            discountPercent: booking.discountApplied,
        })
            .catch((err) => this.logger.error(`Failed to send confirmation email for booking ${bookingId}`, err));
        return { received: true };
    }
};
exports.StripeWebhookService = StripeWebhookService;
exports.StripeWebhookService = StripeWebhookService = StripeWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        email_service_1.EmailService,
        stripe_service_1.StripeService])
], StripeWebhookService);
//# sourceMappingURL=stripe-webhook.service.js.map