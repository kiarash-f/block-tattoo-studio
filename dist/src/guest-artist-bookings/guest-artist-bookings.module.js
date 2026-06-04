"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestArtistBookingsModule = void 0;
const common_1 = require("@nestjs/common");
const guest_artist_bookings_controller_1 = require("./guest-artist-bookings.controller");
const guest_artist_bookings_service_1 = require("./guest-artist-bookings.service");
const guest_booking_expiry_service_1 = require("./guest-booking-expiry.service");
const prisma_service_1 = require("../prisma/prisma.service");
const station_config_module_1 = require("../station-config/station-config.module");
const stripe_module_1 = require("../stripe/stripe.module");
let GuestArtistBookingsModule = class GuestArtistBookingsModule {
};
exports.GuestArtistBookingsModule = GuestArtistBookingsModule;
exports.GuestArtistBookingsModule = GuestArtistBookingsModule = __decorate([
    (0, common_1.Module)({
        imports: [station_config_module_1.StationConfigModule, stripe_module_1.StripeModule],
        controllers: [guest_artist_bookings_controller_1.GuestBookingsPublicController, guest_artist_bookings_controller_1.GuestBookingsAdminController],
        providers: [guest_artist_bookings_service_1.GuestArtistBookingsService, guest_booking_expiry_service_1.GuestBookingExpiryService, prisma_service_1.PrismaService],
    })
], GuestArtistBookingsModule);
//# sourceMappingURL=guest-artist-bookings.module.js.map