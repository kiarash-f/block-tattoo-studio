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
exports.AdminBookingRequestsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const luxon_1 = require("luxon");
let AdminBookingRequestsService = class AdminBookingRequestsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkIn(bookingRequestId, adminId) {
        if (!adminId)
            throw new common_1.ForbiddenException('Missing admin identity');
        const br = await this.prisma.bookingRequest.findUnique({
            where: { id: bookingRequestId },
            select: { id: true, status: true, checkedInAt: true },
        });
        if (!br)
            throw new common_1.NotFoundException('BookingRequest not found');
        if (br.status !== client_1.BookingStatus.TATTOO_SCHEDULED) {
            throw new common_1.BadRequestException('Only TATTOO_SCHEDULED bookings can be checked in');
        }
        if (br.checkedInAt) {
            return this.prisma.bookingRequest.findUnique({
                where: { id: bookingRequestId },
                include: { client: true, assignments: true },
            });
        }
        return this.prisma.bookingRequest.update({
            where: { id: bookingRequestId },
            data: {
                checkedInAt: new Date(),
                checkedInByAdminId: adminId,
            },
            include: { client: true, assignments: true },
        });
    }
    async getInStudioForm(bookingRequestId) {
        const br = await this.prisma.bookingRequest.findUnique({
            where: { id: bookingRequestId },
            include: {
                client: true,
                medicalDeclaration: true,
                consent: true,
                assignments: {
                    include: { artist: true, station: true },
                },
            },
        });
        if (!br)
            throw new common_1.NotFoundException('BookingRequest not found');
        return {
            id: br.id,
            status: br.status,
            checkedInAt: br.checkedInAt,
            inStudioCompletedAt: br.inStudioCompletedAt,
            client: br.client,
            primaryAssignment: br.assignments?.find((a) => a.role === 'PRIMARY') ?? null,
            medicalDeclaration: br.medicalDeclaration,
            consent: br.consent,
        };
    }
    async submitInStudioForm(bookingRequestId, adminId, dto) {
        if (!adminId)
            throw new common_1.ForbiddenException('Missing admin identity');
        const br = await this.prisma.bookingRequest.findUnique({
            where: { id: bookingRequestId },
            select: { id: true, status: true, checkedInAt: true },
        });
        if (!br)
            throw new common_1.NotFoundException('BookingRequest not found');
        if (br.status !== client_1.BookingStatus.TATTOO_SCHEDULED) {
            throw new common_1.BadRequestException('In-studio form can only be submitted for TATTOO_SCHEDULED bookings');
        }
        if (!br.checkedInAt) {
            throw new common_1.BadRequestException('Client must be checked-in before submitting in-studio form');
        }
        const signedAtDate = dto.consent.signedAt
            ? luxon_1.DateTime.fromISO(dto.consent.signedAt).toJSDate()
            : null;
        const result = await this.prisma.$transaction(async (tx) => {
            const now = new Date();
            const medical = await tx.medicalDeclaration.upsert({
                where: { bookingRequestId },
                create: {
                    bookingRequestId,
                    ...dto.medical,
                    submittedAt: now,
                    submittedByAdminId: adminId,
                },
                update: {
                    ...dto.medical,
                    submittedAt: now,
                    submittedByAdminId: adminId,
                },
            });
            const consent = await tx.consent.upsert({
                where: { bookingRequestId },
                create: {
                    bookingRequestId,
                    isAdultConfirmed: dto.consent.isAdultConfirmed,
                    termsAccepted: dto.consent.termsAccepted,
                    privacyAccepted: dto.consent.privacyAccepted,
                    fullName: dto.consent.fullName ?? null,
                    signedAt: signedAtDate,
                    submittedAt: now,
                    submittedByAdminId: adminId,
                },
                update: {
                    isAdultConfirmed: dto.consent.isAdultConfirmed,
                    termsAccepted: dto.consent.termsAccepted,
                    privacyAccepted: dto.consent.privacyAccepted,
                    fullName: dto.consent.fullName ?? null,
                    signedAt: signedAtDate,
                    submittedAt: now,
                    submittedByAdminId: adminId,
                },
            });
            const booking = await tx.bookingRequest.update({
                where: { id: bookingRequestId },
                data: { inStudioCompletedAt: now },
                include: { client: true },
            });
            return { booking, medical, consent };
        });
        return result;
    }
};
exports.AdminBookingRequestsService = AdminBookingRequestsService;
exports.AdminBookingRequestsService = AdminBookingRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminBookingRequestsService);
//# sourceMappingURL=admin-booking-requests.service.js.map