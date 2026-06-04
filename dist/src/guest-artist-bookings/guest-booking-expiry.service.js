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
var GuestBookingExpiryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestBookingExpiryService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let GuestBookingExpiryService = GuestBookingExpiryService_1 = class GuestBookingExpiryService {
    prisma;
    logger = new common_1.Logger(GuestBookingExpiryService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async expireStaleBookings() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = await this.prisma.guestArtistBooking.updateMany({
            where: {
                status: client_1.GuestBookingStatus.PENDING_PAYMENT,
                createdAt: { lt: cutoff },
            },
            data: { status: client_1.GuestBookingStatus.EXPIRED },
        });
        if (result.count > 0) {
            this.logger.log(`Expired ${result.count} stale PENDING_PAYMENT booking(s) older than 24 hours`);
        }
    }
};
exports.GuestBookingExpiryService = GuestBookingExpiryService;
__decorate([
    (0, schedule_1.Cron)('0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GuestBookingExpiryService.prototype, "expireStaleBookings", null);
exports.GuestBookingExpiryService = GuestBookingExpiryService = GuestBookingExpiryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GuestBookingExpiryService);
//# sourceMappingURL=guest-booking-expiry.service.js.map