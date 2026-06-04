"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const setup_1 = require("@sentry/nestjs/setup");
const setup_2 = require("@sentry/nestjs/setup");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const cache_manager_1 = require("@nestjs/cache-manager");
const schedule_1 = require("@nestjs/schedule");
const redis_1 = require("@keyv/redis");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const health_module_1 = require("./health/health.module");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const admin_users_module_1 = require("./admin-users/admin-users.module");
const bookings_module_1 = require("./bookings/bookings.module");
const public_module_1 = require("./public/public.module");
const media_module_1 = require("./media/media.module");
const env_validation_1 = require("./config/env.validation");
const booking_links_module_1 = require("./booking-links/booking-links.module");
const artists_module_1 = require("./artists/artists.module");
const studio_stations_module_1 = require("./studio-stations/studio-stations.module");
const booking_assignments_module_1 = require("./booking-assignments/booking-assignments.module");
const works_module_1 = require("./works/works.module");
const articles_module_1 = require("./articles/articles.module");
const google_reviews_module_1 = require("./google-reviews/google-reviews.module");
const scheduling_module_1 = require("./scheduling/scheduling.module");
const email_module_1 = require("./email/email.module");
const chat_module_1 = require("./chat/chat.module");
const station_config_module_1 = require("./station-config/station-config.module");
const stripe_module_1 = require("./stripe/stripe.module");
const guest_artist_bookings_module_1 = require("./guest-artist-bookings/guest-artist-bookings.module");
const stripe_webhook_module_1 = require("./stripe-webhook/stripe-webhook.module");
const translation_module_1 = require("./translation/translation.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            setup_1.SentryModule.forRoot(),
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: env_validation_1.envValidationSchema,
            }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60,
                    limit: 20,
                },
            ]),
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const redisUrl = config.get('REDIS_URL') ??
                        (() => {
                            const host = config.get('REDIS_HOST') ?? 'localhost';
                            const port = config.get('REDIS_PORT') ?? 6379;
                            const password = config.get('REDIS_PASSWORD');
                            return password
                                ? `redis://:${password}@${host}:${port}`
                                : `redis://${host}:${port}`;
                        })();
                    return {
                        stores: [
                            (0, redis_1.createKeyv)({ url: redisUrl, socket: { connectTimeout: 3000 } }, { throwOnConnectError: false }),
                        ],
                    };
                },
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            admin_users_module_1.AdminUsersModule,
            bookings_module_1.BookingsModule,
            public_module_1.PublicModule,
            media_module_1.MediaModule,
            health_module_1.HealthModule,
            booking_links_module_1.BookingLinksModule,
            artists_module_1.ArtistsModule,
            studio_stations_module_1.StudioStationsModule,
            booking_assignments_module_1.BookingAssignmentsModule,
            works_module_1.WorksModule,
            articles_module_1.ArticlesModule,
            google_reviews_module_1.GoogleReviewsModule,
            scheduling_module_1.SchedulingModule,
            email_module_1.EmailModule,
            chat_module_1.ChatModule,
            station_config_module_1.StationConfigModule,
            stripe_module_1.StripeModule,
            guest_artist_bookings_module_1.GuestArtistBookingsModule,
            stripe_webhook_module_1.StripeWebhookModule,
            translation_module_1.TranslationModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            {
                provide: core_1.APP_FILTER,
                useClass: setup_2.SentryGlobalFilter,
            },
            app_service_1.AppService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map