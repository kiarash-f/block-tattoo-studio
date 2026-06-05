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
exports.PublicService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const media_service_1 = require("../media/media.service");
const email_service_1 = require("../email/email.service");
const booking_intake_dto_1 = require("./dto/booking-intake.dto");
const client_1 = require("@prisma/client");
function mapBudgetRangeToPrisma(v) {
    switch (v) {
        case booking_intake_dto_1.BudgetRange.UNDER_200:
            return client_1.BudgetRange.UNDER_200;
        case booking_intake_dto_1.BudgetRange._200_400:
            return client_1.BudgetRange.B200_400;
        case booking_intake_dto_1.BudgetRange._400_700:
            return client_1.BudgetRange.B400_700;
        case booking_intake_dto_1.BudgetRange._700_1000:
            return client_1.BudgetRange.B700_1000;
        case booking_intake_dto_1.BudgetRange._1000_1500:
            return client_1.BudgetRange.B1000_1500;
        case booking_intake_dto_1.BudgetRange._1500_2000:
            return client_1.BudgetRange.B1500_2000;
        case booking_intake_dto_1.BudgetRange.OVER_2000:
            return client_1.BudgetRange.OVER_2000;
        default:
            throw new common_1.BadRequestException(`Unsupported budgetRange: ${v}`);
    }
}
function mapBookingTypeToPrisma(v) {
    if (!v)
        return undefined;
    switch (v) {
        case booking_intake_dto_1.BookingType.APPOINTMENT:
            return client_1.BookingType.APPOINTMENT;
        case booking_intake_dto_1.BookingType.CONSULTATION:
            return client_1.BookingType.CONSULTATION;
        case booking_intake_dto_1.BookingType.COVER_UP:
            return client_1.BookingType.COVER_UP;
        case booking_intake_dto_1.BookingType.WALK_IN:
            return client_1.BookingType.WALK_IN;
        default:
            throw new common_1.BadRequestException(`Unsupported bookingType: ${v}`);
    }
}
function mapPreferredTimeOfDayToPrisma(v) {
    if (!v)
        return undefined;
    switch (v) {
        case booking_intake_dto_1.PreferredTimeOfDay.MORNING:
            return client_1.PreferredTimeOfDay.MORNING;
        case booking_intake_dto_1.PreferredTimeOfDay.AFTERNOON:
            return client_1.PreferredTimeOfDay.AFTERNOON;
        case booking_intake_dto_1.PreferredTimeOfDay.EVENING:
            return client_1.PreferredTimeOfDay.EVENING;
        case booking_intake_dto_1.PreferredTimeOfDay.ANY:
            return client_1.PreferredTimeOfDay.ANY;
        default:
            throw new common_1.BadRequestException(`Unsupported preferredTimeOfDay: ${v}`);
    }
}
function parseOptionalDate(name, value) {
    if (!value)
        return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
        throw new common_1.BadRequestException(`Invalid ${name}`);
    }
    return d;
}
let PublicService = class PublicService {
    prisma;
    media;
    email;
    constructor(prisma, media, email) {
        this.prisma = prisma;
        this.media = media;
        this.email = email;
    }
    async createBookingIntake(dto, files) {
        const result = await this.prisma.$transaction(async (tx) => {
            const { client, bookingRequest } = dto;
            let existing = null;
            if (client.email) {
                existing = await tx.client.findFirst({
                    where: { email: client.email },
                    select: { id: true, instagram: true, birthday: true },
                });
            }
            if (!existing && client.phone) {
                existing = await tx.client.findFirst({
                    where: { phone: client.phone },
                    select: { id: true, instagram: true, birthday: true },
                });
            }
            const clientRow = existing
                ? await tx.client.update({
                    where: { id: existing.id },
                    data: {
                        firstName: client.firstName,
                        lastName: client.lastName,
                        email: client.email ?? undefined,
                        phone: client.phone ?? undefined,
                        instagram: client.instagram ?? existing.instagram ?? undefined,
                        birthday: client.birthday
                            ? new Date(client.birthday)
                            : (existing.birthday ?? undefined),
                    },
                })
                : await tx.client.create({
                    data: {
                        firstName: client.firstName,
                        lastName: client.lastName,
                        email: client.email ?? undefined,
                        phone: client.phone ?? undefined,
                        instagram: client.instagram ?? undefined,
                        birthday: client.birthday ? new Date(client.birthday) : undefined,
                    },
                });
            const preferredArtistName = bookingRequest.preferredArtistName?.trim() || undefined;
            const preferredDateFrom = parseOptionalDate('preferredDateFrom', bookingRequest.preferredDateFrom);
            const preferredDateTo = parseOptionalDate('preferredDateTo', bookingRequest.preferredDateTo);
            if (preferredDateFrom &&
                preferredDateTo &&
                preferredDateTo < preferredDateFrom) {
                throw new common_1.BadRequestException('preferredDateTo must be after preferredDateFrom');
            }
            const consultDateRaw = bookingRequest.consultDate;
            const consultDate = new Date(consultDateRaw);
            if (Number.isNaN(consultDate.getTime())) {
                throw new common_1.BadRequestException('Invalid consultDate');
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (consultDate < today) {
                throw new common_1.BadRequestException('consultDate cannot be in the past');
            }
            if (consultDate.getDay() === 0) {
                throw new common_1.BadRequestException('Studio is closed on Sundays');
            }
            const consultSlot = await tx.consultSlot.upsert({
                where: { date: consultDate },
                create: { date: consultDate, maxCount: 3 },
                update: {},
            });
            const studioChooses = preferredArtistName
                ? (bookingRequest.studioChooses ?? false)
                : true;
            const source = bookingRequest.source ?? client_1.IntakeSource.DIRECT;
            const br = await tx.bookingRequest.create({
                data: {
                    clientId: clientRow.id,
                    status: 'PENDING_CONSULT',
                    consultDate,
                    consultSlotId: consultSlot.id,
                    preferredDateFrom: preferredDateFrom ?? undefined,
                    preferredDateTo: preferredDateTo ?? undefined,
                    preferredTimeOfDay: mapPreferredTimeOfDayToPrisma(bookingRequest.preferredTimeOfDay),
                    preferredDaysNote: bookingRequest.preferredDaysNote ?? undefined,
                    description: bookingRequest.description,
                    budgetRange: mapBudgetRangeToPrisma(bookingRequest.budgetRange),
                    bookingType: mapBookingTypeToPrisma(bookingRequest.bookingType),
                    placement: bookingRequest.placement ?? undefined,
                    sizeDescription: bookingRequest.sizeDescription ?? undefined,
                    styleNotes: bookingRequest.styleNotes ?? undefined,
                    referencesNotes: bookingRequest.referencesNotes ?? undefined,
                    preferredArtistName,
                    studioChooses,
                    source,
                    utmCampaign: bookingRequest.utmCampaign ?? undefined,
                    utmAdset: bookingRequest.utmAdset ?? undefined,
                    utmAd: bookingRequest.utmAd ?? undefined,
                    referrer: bookingRequest.referrer ?? undefined,
                    landingPath: bookingRequest.landingPath ?? undefined,
                },
            });
            if (files?.length) {
                for (const f of files) {
                    if (!f?.buffer)
                        continue;
                    const uploaded = await this.media.uploadBuffer(f.buffer, {
                        folder: 'tattoo-studio/booking-requests',
                        filename: f.originalname,
                    });
                    await tx.upload.create({
                        data: {
                            bookingRequestId: br.id,
                            kind: client_1.UploadKind.REFERENCE,
                            originalName: f.originalname ?? undefined,
                            mimeType: f.mimetype ?? undefined,
                            bytes: typeof f.size === 'number' ? f.size : undefined,
                            cloudinaryPublicId: uploaded.publicId,
                            secureUrl: uploaded.secureUrl,
                        },
                    });
                }
            }
            return {
                bookingRequestId: br.id,
                status: br.status,
                createdAt: br.createdAt,
                clientEmail: clientRow.email ?? null,
                clientName: `${clientRow.firstName} ${clientRow.lastName}`.trim(),
            };
        });
        if (result.clientEmail) {
            this.email
                .sendBookingConfirmation({
                to: result.clientEmail,
                clientName: result.clientName,
                bookingRequestId: result.bookingRequestId,
            })
                .catch(() => void 0);
        }
        return {
            bookingRequestId: result.bookingRequestId,
            status: result.status,
            createdAt: result.createdAt,
        };
    }
    async getMonthAvailability(month) {
        if (!/^\d{4}-\d{2}$/.test(month)) {
            throw new common_1.BadRequestException('month must be in YYYY-MM format');
        }
        const [year, mon] = month.split('-').map(Number);
        const firstDay = new Date(year, mon - 1, 1);
        const lastDay = new Date(year, mon, 0);
        const slots = await this.prisma.consultSlot.findMany({
            where: {
                date: { gte: firstDay, lte: lastDay },
            },
            include: {
                _count: {
                    select: {
                        bookings: {
                            where: {
                                status: { in: ['PENDING_CONSULT', 'CONSULT_APPROVED'] },
                            },
                        },
                    },
                },
            },
        });
        const slotMap = new Map();
        for (const s of slots) {
            const key = s.date.toISOString().slice(0, 10);
            slotMap.set(key, s._count.bookings);
        }
        const SOFT_LIMIT = 3;
        const days = [];
        for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const isSunday = d.getDay() === 0;
            const count = slotMap.get(dateStr) ?? 0;
            days.push({
                date: dateStr,
                status: isSunday ? 'closed' : count >= SOFT_LIMIT ? 'busy' : 'open',
                count,
            });
        }
        return { month, days };
    }
};
exports.PublicService = PublicService;
exports.PublicService = PublicService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        media_service_1.MediaService,
        email_service_1.EmailService])
], PublicService);
//# sourceMappingURL=public.service.js.map