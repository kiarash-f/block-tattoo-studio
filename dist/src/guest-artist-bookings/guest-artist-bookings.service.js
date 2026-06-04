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
var GuestArtistBookingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuestArtistBookingsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const stripe_service_1 = require("../stripe/stripe.service");
const station_config_service_1 = require("../station-config/station-config.service");
const ACTIVE_STATUSES = [
    client_1.GuestBookingStatus.PENDING_PAYMENT,
    client_1.GuestBookingStatus.CONFIRMED,
];
function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}
function countDays(start, end) {
    return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
function* eachDay(start, end) {
    const cur = new Date(start);
    while (cur <= end) {
        yield new Date(cur);
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
}
let GuestArtistBookingsService = GuestArtistBookingsService_1 = class GuestArtistBookingsService {
    prisma;
    stripe;
    configSvc;
    logger = new common_1.Logger(GuestArtistBookingsService_1.name);
    constructor(prisma, stripe, configSvc) {
        this.prisma = prisma;
        this.stripe = stripe;
        this.configSvc = configSvc;
    }
    async getAvailability(startDateStr, endDateStr) {
        const startDate = parseDate(startDateStr);
        const endDate = parseDate(endDateStr);
        if (endDate < startDate) {
            throw new common_1.BadRequestException('endDate must be on or after startDate');
        }
        const config = await this.configSvc.get();
        const overlapping = await this.prisma.guestArtistBooking.findMany({
            where: {
                status: { in: ACTIVE_STATUSES },
                startDate: { lte: endDate },
                endDate: { gte: startDate },
            },
            select: { startDate: true, endDate: true, numberOfTables: true },
        });
        const bookedMap = new Map();
        for (const b of overlapping) {
            for (const day of eachDay(b.startDate, b.endDate)) {
                const key = day.toISOString().slice(0, 10);
                bookedMap.set(key, (bookedMap.get(key) ?? 0) + b.numberOfTables);
            }
        }
        const days = [];
        for (const day of eachDay(startDate, endDate)) {
            const key = day.toISOString().slice(0, 10);
            const booked = bookedMap.get(key) ?? 0;
            days.push({
                date: key,
                totalTables: config.totalTables,
                bookedTables: booked,
                availableTables: Math.max(0, config.totalTables - booked),
            });
        }
        return {
            startDate: startDateStr,
            endDate: endDateStr,
            pricePerDay: config.pricePerDay,
            monthlyDiscountPercent: config.monthlyDiscountPercent,
            days,
        };
    }
    async create(dto) {
        if (!dto.acknowledgment) {
            throw new common_1.BadRequestException('You must acknowledge the booking terms.');
        }
        const startDate = parseDate(dto.startDate);
        const endDate = parseDate(dto.endDate);
        if (endDate < startDate) {
            throw new common_1.BadRequestException('endDate must be on or after startDate');
        }
        const config = await this.configSvc.get();
        const numberOfDays = countDays(startDate, endDate);
        const applyDiscount = numberOfDays >= 30;
        const discountPercent = applyDiscount ? config.monthlyDiscountPercent : 0;
        const multiplier = 1 - discountPercent / 100;
        const totalPrice = parseFloat((config.pricePerDay * dto.numberOfTables * numberOfDays * multiplier).toFixed(2));
        const booking = await this.prisma.$transaction(async (tx) => {
            const overlapping = await tx.guestArtistBooking.findMany({
                where: {
                    status: { in: ACTIVE_STATUSES },
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                },
                select: { startDate: true, endDate: true, numberOfTables: true },
            });
            const bookedMap = new Map();
            for (const b of overlapping) {
                for (const day of eachDay(b.startDate, b.endDate)) {
                    const key = day.toISOString().slice(0, 10);
                    bookedMap.set(key, (bookedMap.get(key) ?? 0) + b.numberOfTables);
                }
            }
            for (const day of eachDay(startDate, endDate)) {
                const key = day.toISOString().slice(0, 10);
                const already = bookedMap.get(key) ?? 0;
                if (already + dto.numberOfTables > config.totalTables) {
                    throw new common_1.BadRequestException(`Not enough tables available on ${key}. ` +
                        `Available: ${config.totalTables - already}, requested: ${dto.numberOfTables}.`);
                }
            }
            return tx.guestArtistBooking.create({
                data: {
                    name: dto.name,
                    phone: dto.phone,
                    email: dto.email,
                    startDate,
                    endDate,
                    numberOfTables: dto.numberOfTables,
                    totalPrice,
                    discountApplied: discountPercent,
                    acknowledgment: dto.acknowledgment,
                    status: client_1.GuestBookingStatus.PENDING_PAYMENT,
                },
            });
        });
        const { sessionId, paymentUrl } = await this.stripe.createCheckoutSession({
            guestName: dto.name,
            email: dto.email,
            totalPrice,
            bookingId: booking.id,
            numberOfTables: dto.numberOfTables,
            numberOfDays,
            startDate,
            endDate,
        });
        const updatedBooking = await this.prisma.guestArtistBooking.update({
            where: { id: booking.id },
            data: {
                stripeSessionId: sessionId,
                stripePaymentUrl: paymentUrl,
            },
        });
        return {
            booking: updatedBooking,
            stripePaymentUrl: paymentUrl,
        };
    }
    async list(query) {
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.from || query.to) {
            if (query.from)
                where.endDate = { gte: parseDate(query.from) };
            if (query.to)
                where.startDate = { ...where.startDate, lte: parseDate(query.to) };
        }
        const items = await this.prisma.guestArtistBooking.findMany({
            where,
            orderBy: { startDate: 'asc' },
        });
        return { total: items.length, items };
    }
    async detail(id) {
        const booking = await this.prisma.guestArtistBooking.findUnique({ where: { id } });
        if (!booking)
            throw new common_1.NotFoundException('Guest booking not found');
        return booking;
    }
    async update(id, dto) {
        const existing = await this.prisma.guestArtistBooking.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Guest booking not found');
        const needsRecalc = dto.startDate !== undefined ||
            dto.endDate !== undefined ||
            dto.numberOfTables !== undefined;
        const startDate = dto.startDate ? parseDate(dto.startDate) : existing.startDate;
        const endDate = dto.endDate ? parseDate(dto.endDate) : existing.endDate;
        const numberOfTables = dto.numberOfTables ?? existing.numberOfTables;
        if (endDate < startDate) {
            throw new common_1.BadRequestException('endDate must be on or after startDate');
        }
        let totalPrice = existing.totalPrice;
        let discountApplied = existing.discountApplied;
        if (needsRecalc) {
            const config = await this.configSvc.get();
            const numberOfDays = countDays(startDate, endDate);
            const applyDiscount = numberOfDays >= 30;
            const discountPercent = applyDiscount ? config.monthlyDiscountPercent : 0;
            discountApplied = discountPercent;
            totalPrice = parseFloat((config.pricePerDay * numberOfTables * numberOfDays * (1 - discountPercent / 100)).toFixed(2));
        }
        return this.prisma.guestArtistBooking.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
                ...(dto.email !== undefined ? { email: dto.email } : {}),
                ...(dto.status !== undefined ? { status: dto.status } : {}),
                ...(dto.startDate !== undefined ? { startDate } : {}),
                ...(dto.endDate !== undefined ? { endDate } : {}),
                ...(dto.numberOfTables !== undefined ? { numberOfTables } : {}),
                ...(needsRecalc ? { totalPrice, discountApplied } : {}),
            },
        });
    }
    async remove(id) {
        const existing = await this.prisma.guestArtistBooking.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('Guest booking not found');
        return this.prisma.guestArtistBooking.delete({ where: { id } });
    }
};
exports.GuestArtistBookingsService = GuestArtistBookingsService;
exports.GuestArtistBookingsService = GuestArtistBookingsService = GuestArtistBookingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        station_config_service_1.StationConfigService])
], GuestArtistBookingsService);
//# sourceMappingURL=guest-artist-bookings.service.js.map