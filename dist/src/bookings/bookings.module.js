"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsModule = void 0;
const common_1 = require("@nestjs/common");
const bookings_controller_1 = require("./bookings.controller");
const bookings_service_1 = require("./bookings.service");
const prisma_service_1 = require("../prisma/prisma.service");
const admin_appointments_controller_1 = require("./admin-appointments.controller");
const admin_analytics_module_1 = require("./admin-analytics/admin-analytics.module");
const admin_bookings_module_1 = require("./admin/admin-bookings.module");
const media_module_1 = require("../media/media.module");
let BookingsModule = class BookingsModule {
};
exports.BookingsModule = BookingsModule;
exports.BookingsModule = BookingsModule = __decorate([
    (0, common_1.Module)({
        controllers: [bookings_controller_1.BookingsController, admin_appointments_controller_1.AdminAppointmentsController],
        providers: [bookings_service_1.BookingsService, prisma_service_1.PrismaService],
        exports: [bookings_service_1.BookingsService],
        imports: [admin_analytics_module_1.AdminAnalyticsModule, admin_bookings_module_1.AdminBookingsModule, media_module_1.MediaModule],
    })
], BookingsModule);
//# sourceMappingURL=bookings.module.js.map