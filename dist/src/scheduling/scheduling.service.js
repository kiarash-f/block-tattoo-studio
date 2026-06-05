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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
let SchedulingService = class SchedulingService {
    prisma;
    email;
    constructor(prisma, email) {
        this.prisma = prisma;
        this.email = email;
    }
    async createConsultSlot(dto) {
        const date = new Date(dto.date);
        if (date <= new Date()) {
            throw new common_1.BadRequestException('Consult slot date must be in the future');
        }
        const existing = await this.prisma.consultSlot.findUnique({
            where: { date },
        });
        if (existing) {
            throw new common_1.BadRequestException('A consult slot already exists for this date');
        }
        return this.prisma.consultSlot.create({
            data: { date, maxCount: dto.maxCount ?? 3 },
        });
    }
    async listConsultSlots() {
        const slots = await this.prisma.consultSlot.findMany({
            orderBy: { date: 'asc' },
            include: { _count: { select: { bookings: true } } },
        });
        return slots.map((s) => ({
            id: s.id,
            date: s.date,
            maxCount: s.maxCount,
            bookedCount: s._count.bookings,
            available: s._count.bookings < s.maxCount,
            createdAt: s.createdAt,
        }));
    }
    async deleteConsultSlot(id) {
        const slot = await this.prisma.consultSlot.findUnique({
            where: { id },
            include: { _count: { select: { bookings: true } } },
        });
        if (!slot)
            throw new common_1.NotFoundException('Consult slot not found');
        if (slot._count.bookings > 0) {
            throw new common_1.BadRequestException('Cannot delete a slot that has bookings assigned');
        }
        return this.prisma.consultSlot.delete({ where: { id } });
    }
    async assignConsultSlot(bookingId, dto) {
        const booking = await this.prisma.bookingRequest.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                status: true,
                consultSlotId: true,
                client: { select: { email: true, firstName: true, lastName: true } },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.status !== client_1.BookingStatus.PENDING_CONSULT) {
            throw new common_1.BadRequestException('Booking must be PENDING_CONSULT before assigning a consult slot');
        }
        if (booking.consultSlotId) {
            throw new common_1.BadRequestException('Booking already has a consult slot assigned');
        }
        const slot = await this.prisma.consultSlot.findUnique({
            where: { id: dto.consultSlotId },
            include: { _count: { select: { bookings: true } } },
        });
        if (!slot)
            throw new common_1.NotFoundException('Consult slot not found');
        if (slot._count.bookings >= slot.maxCount) {
            throw new common_1.BadRequestException('Consult slot is fully booked');
        }
        if (slot.date <= new Date()) {
            throw new common_1.BadRequestException('Consult slot date is in the past');
        }
        const updated = await this.prisma.bookingRequest.update({
            where: { id: bookingId },
            data: { consultSlotId: dto.consultSlotId },
            select: {
                id: true,
                status: true,
                consultSlotId: true,
                consultSlot: { select: { id: true, date: true, maxCount: true } },
            },
        });
        if (booking.client.email && slot.date) {
            this.email
                .sendConsultConfirmation({
                to: booking.client.email,
                clientName: `${booking.client.firstName} ${booking.client.lastName}`.trim(),
                consultDate: slot.date,
            })
                .catch(() => void 0);
        }
        return updated;
    }
    async getAvailableConsultDates() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const slots = await this.prisma.consultSlot.findMany({
            where: { date: { gt: today } },
            orderBy: { date: 'asc' },
            include: { _count: { select: { bookings: true } } },
        });
        const availableDates = slots
            .filter((s) => s._count.bookings < s.maxCount)
            .map((s) => s.date.toISOString().split('T')[0]);
        return { availableDates };
    }
    async createTattooSession(bookingId, dto) {
        const booking = await this.prisma.bookingRequest.findUnique({
            where: { id: bookingId },
            select: {
                id: true,
                status: true,
                client: { select: { email: true, firstName: true, lastName: true } },
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.status !== client_1.BookingStatus.CONSULT_APPROVED) {
            throw new common_1.BadRequestException('Booking must be CONSULT_APPROVED before creating a tattoo session');
        }
        const scheduledDate = new Date(dto.scheduledDate);
        if (scheduledDate <= new Date()) {
            throw new common_1.BadRequestException('Session date must be in the future');
        }
        const artist = await this.prisma.artist.findUnique({
            where: { id: dto.artistId },
            select: { id: true, displayName: true },
        });
        if (!artist)
            throw new common_1.NotFoundException('Artist not found');
        const station = await this.prisma.studioStation.findFirst({
            where: { status: client_1.StationStatus.ACTIVE },
            select: { id: true },
        });
        const session = await this.prisma.tattooSession.create({
            data: {
                bookingRequestId: bookingId,
                artistId: dto.artistId,
                stationId: station?.id ?? null,
                scheduledDate,
                durationNote: dto.durationNote,
                notes: dto.notes,
            },
            include: {
                artist: { select: { id: true, displayName: true } },
                station: { select: { id: true, name: true } },
            },
        });
        if (booking.client.email) {
            this.email
                .sendSessionReminder({
                to: booking.client.email,
                clientName: `${booking.client.firstName}${booking.client.lastName}`.trim(),
                sessionDate: session.scheduledDate,
                artistName: session.artist.displayName,
            })
                .catch(() => void 0);
        }
        return session;
    }
    async listTattooSessions(bookingId) {
        const booking = await this.prisma.bookingRequest.findUnique({
            where: { id: bookingId },
            select: { id: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        return this.prisma.tattooSession.findMany({
            where: { bookingRequestId: bookingId },
            orderBy: { scheduledDate: 'asc' },
            include: {
                artist: { select: { id: true, displayName: true } },
                station: { select: { id: true, name: true } },
            },
        });
    }
    async updateTattooSession(sessionId, dto) {
        const session = await this.prisma.tattooSession.findUnique({
            where: { id: sessionId },
        });
        if (!session)
            throw new common_1.NotFoundException('Tattoo session not found');
        if (dto.scheduledDate) {
            const date = new Date(dto.scheduledDate);
            if (date <= new Date()) {
                throw new common_1.BadRequestException('Session date must be in the future');
            }
        }
        if (dto.artistId) {
            const artist = await this.prisma.artist.findUnique({
                where: { id: dto.artistId },
                select: { id: true },
            });
            if (!artist)
                throw new common_1.NotFoundException('Artist not found');
        }
        return this.prisma.tattooSession.update({
            where: { id: sessionId },
            data: {
                ...(dto.scheduledDate
                    ? { scheduledDate: new Date(dto.scheduledDate) }
                    : {}),
                ...(dto.artistId ? { artistId: dto.artistId } : {}),
                ...(dto.durationNote !== undefined
                    ? { durationNote: dto.durationNote }
                    : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
            },
            include: {
                artist: { select: { id: true, displayName: true } },
                station: { select: { id: true, name: true } },
            },
        });
    }
    async completeTattooSession(sessionId) {
        const session = await this.prisma.tattooSession.findUnique({
            where: { id: sessionId },
        });
        if (!session)
            throw new common_1.NotFoundException('Tattoo session not found');
        if (session.completedAt) {
            throw new common_1.BadRequestException('Session is already marked as completed');
        }
        return this.prisma.tattooSession.update({
            where: { id: sessionId },
            data: { completedAt: new Date() },
            include: {
                artist: { select: { id: true, displayName: true } },
                station: { select: { id: true, name: true } },
            },
        });
    }
    async deleteTattooSession(sessionId) {
        const session = await this.prisma.tattooSession.findUnique({
            where: { id: sessionId },
        });
        if (!session)
            throw new common_1.NotFoundException('Tattoo session not found');
        return this.prisma.tattooSession.delete({ where: { id: sessionId } });
    }
};
exports.SchedulingService = SchedulingService;
exports.SchedulingService = SchedulingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], SchedulingService);
//# sourceMappingURL=scheduling.service.js.map