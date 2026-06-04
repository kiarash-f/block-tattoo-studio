"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingLinksModule = void 0;
const common_1 = require("@nestjs/common");
const booking_links_service_1 = require("./booking-links.service");
const booking_links_controller_1 = require("./booking-links.controller");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const public_booking_controller_1 = require("./public-booking.controller");
const public_token_guard_1 = require("./guards/public-token.guard");
const token_scopes_guard_1 = require("./guards/token-scopes.guard");
const bookings_module_1 = require("../bookings/bookings.module");
const booking_links_uploads_service_1 = require("./uploads/booking-links-uploads.service");
const media_module_1 = require("../media/media.module");
let BookingLinksModule = class BookingLinksModule {
};
exports.BookingLinksModule = BookingLinksModule;
exports.BookingLinksModule = BookingLinksModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, bookings_module_1.BookingsModule, media_module_1.MediaModule],
        providers: [
            booking_links_service_1.BookingLinksService,
            prisma_service_1.PrismaService,
            public_token_guard_1.PublicTokenGuard,
            token_scopes_guard_1.TokenScopesGuard,
            booking_links_uploads_service_1.BookingLinksUploadsService,
        ],
        controllers: [booking_links_controller_1.BookingLinksController, public_booking_controller_1.PublicBookingController],
        exports: [booking_links_service_1.BookingLinksService],
    })
], BookingLinksModule);
//# sourceMappingURL=booking-links.module.js.map