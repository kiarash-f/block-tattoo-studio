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
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
const client_1 = require("@prisma/client");
const media_service_1 = require("../media/media.service");
const zoned_date_range_1 = require("../common/time/zoned-date-range");
const ALLOWED_TRANSITIONS = {
    PENDING_CONSULT: ['CONSULT_APPROVED', 'CANCELLED'],
    CONSULT_APPROVED: ['CONSULT_NO_SHOW', 'CANCELLED'],
    CONSULT_NO_SHOW: [],
    TATTOO_SCHEDULED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
};
const REVIEWED_STATUSES = ['CONSULT_APPROVED'];
let BookingsService = class BookingsService {
    prisma;
    email;
    media;
    constructor(prisma, email, media) {
        this.prisma = prisma;
        this.email = email;
        this.media = media;
    }
    async list(params) {
        const { status, q, page, limit } = params;
        const skip = (page - 1) * limit;
        const where = {};
        if (status)
            where.status = status;
        if (q?.trim()) {
            const term = q.trim();
            where.client = {
                is: {
                    OR: [
                        { firstName: { contains: term, mode: 'insensitive' } },
                        { lastName: { contains: term, mode: 'insensitive' } },
                        { email: { contains: term, mode: 'insensitive' } },
                        { phone: { contains: term, mode: 'insensitive' } },
                    ],
                },
            };
        }
        const [total, items] = await this.prisma.$transaction([
            this.prisma.bookingRequest.count({ where }),
            this.prisma.bookingRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { client: true },
            }),
        ]);
        return { total, page, limit, items };
    }
    async detail(id) {
        return this.prisma.bookingRequest.findUniqueOrThrow({
            where: { id },
            include: {
                client: true,
                medicalDeclaration: true,
                consent: true,
                uploads: { orderBy: { createdAt: 'desc' } },
                assignments: {
                    include: { artist: true, station: true },
                    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
                },
                reviewedByAdmin: {
                    select: { id: true, email: true, displayName: true },
                },
            },
        });
    }
    async updateStatus(id, adminId, data) {
        const current = await this.prisma.bookingRequest.findUniqueOrThrow({
            where: { id },
            select: { status: true },
        });
        const next = data.status;
        if (next === client_1.BookingStatus.TATTOO_SCHEDULED) {
            throw new common_1.BadRequestException('Use POST /admin/bookings/:id/schedule-tattoo to schedule the tattoo date');
        }
        const allowedNext = ALLOWED_TRANSITIONS[current.status] ?? [];
        if (!allowedNext.includes(next) && current.status !== next) {
            throw new common_1.BadRequestException(`Invalid status transition: ${current.status} -> ${next}`);
        }
        const now = new Date();
        if (next === client_1.BookingStatus.COMPLETED) {
            const session = await this.prisma.tattooSession.findFirst({
                where: { bookingRequestId: id },
                orderBy: { scheduledDate: 'asc' },
                select: { scheduledDate: true },
            });
            if (!session) {
                throw new common_1.BadRequestException('Cannot complete: no tattoo session scheduled');
            }
            if (session.scheduledDate > now) {
                throw new common_1.BadRequestException('Cannot complete before the tattoo session date');
            }
        }
        if (next === client_1.BookingStatus.CANCELLED && !data.cancelReason) {
            data.cancelReason = client_1.CancelReason.OTHER;
        }
        const eventFields = {};
        if (next === client_1.BookingStatus.CONSULT_APPROVED)
            eventFields.approvedAt = now;
        if (next === client_1.BookingStatus.CONSULT_NO_SHOW) {
            eventFields.cancelledAt = now;
            eventFields.cancelReason = client_1.CancelReason.NO_SHOW;
        }
        if (next === client_1.BookingStatus.COMPLETED) {
            eventFields.completedAt = now;
            eventFields.cancelledAt = null;
            eventFields.cancelReason = null;
        }
        if (next === client_1.BookingStatus.CANCELLED) {
            eventFields.cancelledAt = now;
            eventFields.cancelReason = data.cancelReason;
            eventFields.completedAt = null;
        }
        const shouldSetReviewed = REVIEWED_STATUSES.includes(next);
        const updated = await this.prisma.bookingRequest.update({
            where: { id },
            data: {
                status: next,
                adminNotes: data.adminNotes,
                internalStatusNote: data.internalStatusNote,
                ...eventFields,
                ...(shouldSetReviewed
                    ? { reviewedAt: now, reviewedByAdmin: { connect: { id: adminId } } }
                    : {}),
            },
            include: {
                client: { select: { email: true, firstName: true, lastName: true } },
            },
        });
        if (next === client_1.BookingStatus.CANCELLED && updated.client.email) {
            this.email
                .sendBookingRejected({
                to: updated.client.email,
                clientName: `${updated.client.firstName} ${updated.client.lastName}`.trim(),
            })
                .catch(() => void 0);
        }
        return updated;
    }
    async scheduleTattooSession(bookingRequestId, data) {
        const booking = await this.prisma.bookingRequest.findUniqueOrThrow({
            where: { id: bookingRequestId },
            select: {
                status: true,
                client: { select: { email: true, firstName: true, lastName: true } },
            },
        });
        if (booking.status !== client_1.BookingStatus.CONSULT_APPROVED) {
            throw new common_1.BadRequestException(`Can only schedule tattoo from CONSULT_APPROVED status (current: ${booking.status})`);
        }
        const artist = await this.prisma.artist.findUnique({
            where: { id: data.artistId },
            select: { id: true, status: true, displayName: true },
        });
        if (!artist || artist.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Artist not found or inactive');
        }
        const session = await this.prisma.$transaction(async (tx) => {
            const s = await tx.tattooSession.create({
                data: {
                    bookingRequestId,
                    artistId: data.artistId,
                    stationId: data.stationId,
                    scheduledDate: data.scheduledDate,
                    durationNote: data.durationNote,
                    notes: data.notes,
                },
            });
            await tx.bookingRequest.update({
                where: { id: bookingRequestId },
                data: { status: client_1.BookingStatus.TATTOO_SCHEDULED },
            });
            return s;
        });
        if (booking.client.email) {
            this.email
                .sendSessionReminder({
                to: booking.client.email,
                clientName: `${booking.client.firstName} ${booking.client.lastName}`.trim(),
                sessionDate: data.scheduledDate,
                artistName: artist.displayName,
            })
                .catch(() => void 0);
        }
        return session;
    }
    async createWalkIn(adminId, data, files) {
        const artist = await this.prisma.artist.findUnique({
            where: { id: data.artistId },
            select: { id: true, status: true },
        });
        if (!artist || artist.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('Artist not found or inactive');
        }
        const result = await this.prisma.$transaction(async (tx) => {
            let clientRow = data.client.email
                ? await tx.client.findFirst({ where: { email: data.client.email } })
                : null;
            if (!clientRow && data.client.phone) {
                clientRow = await tx.client.findFirst({
                    where: { phone: data.client.phone },
                });
            }
            clientRow = clientRow
                ? await tx.client.update({
                    where: { id: clientRow.id },
                    data: {
                        firstName: data.client.firstName,
                        lastName: data.client.lastName,
                        email: data.client.email,
                        phone: data.client.phone,
                        instagram: data.client.instagram,
                    },
                })
                : await tx.client.create({
                    data: {
                        firstName: data.client.firstName,
                        lastName: data.client.lastName,
                        email: data.client.email,
                        phone: data.client.phone,
                        instagram: data.client.instagram,
                    },
                });
            const booking = await tx.bookingRequest.create({
                data: {
                    clientId: clientRow.id,
                    status: client_1.BookingStatus.TATTOO_SCHEDULED,
                    bookingType: client_1.BookingType.WALK_IN,
                    description: data.description,
                    budgetRange: data.budgetRange ?? client_1.BudgetRange.UNDER_200,
                    placement: data.placement,
                    sizeDescription: data.sizeDescription,
                    styleNotes: data.styleNotes,
                    studioChooses: false,
                    reviewedAt: new Date(),
                    reviewedByAdminId: adminId,
                    approvedAt: new Date(),
                },
            });
            await tx.tattooSession.create({
                data: {
                    bookingRequestId: booking.id,
                    artistId: data.artistId,
                    stationId: data.stationId,
                    scheduledDate: data.tattooDate,
                    durationNote: data.durationNote,
                },
            });
            return { booking, client: clientRow };
        });
        if (files?.length) {
            for (const f of files) {
                if (!f?.buffer)
                    continue;
                const uploaded = await this.media.uploadBuffer(f.buffer, {
                    folder: 'tattoo-studio/walk-in',
                    filename: f.originalname,
                });
                await this.prisma.upload.create({
                    data: {
                        bookingRequestId: result.booking.id,
                        kind: client_1.UploadKind.REFERENCE,
                        originalName: f.originalname,
                        mimeType: f.mimetype,
                        bytes: f.size,
                        cloudinaryPublicId: uploaded.publicId,
                        secureUrl: uploaded.secureUrl,
                    },
                });
            }
        }
        const token = await this.generateUploadToken(result.booking.id, adminId);
        if (result.client.email) {
            this.email
                .sendBookingConfirmation({
                to: result.client.email,
                clientName: `${result.client.firstName} ${result.client.lastName}`.trim(),
                bookingRequestId: result.booking.id,
            })
                .catch(() => void 0);
        }
        return {
            bookingId: result.booking.id,
            clientId: result.client.id,
            tattooDate: data.tattooDate,
            uploadToken: token,
        };
    }
    async generateUploadToken(bookingRequestId, adminId) {
        const crypto = await import('crypto');
        const argon2 = await import('argon2');
        const secret = crypto.randomBytes(24).toString('base64url');
        const pepper = process.env.BOOKING_LINK_TOKEN_PEPPER ?? '';
        const secretHash = await argon2.hash(`${secret}:${pepper}`, {
            type: argon2.argon2id,
        });
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 4);
        const tokenRow = await this.prisma.bookingLinkToken.create({
            data: {
                bookingRequestId,
                secretHash,
                scopes: ['UPLOAD', 'VIEW'],
                expiresAt,
                createdByAdminId: adminId,
            },
        });
        return `${tokenRow.id}.${secret}`;
    }
    async getPublicIntake(bookingRequestId) {
        const booking = await this.prisma.bookingRequest.findUnique({
            where: { id: bookingRequestId },
            select: {
                id: true,
                status: true,
                placement: true,
                sizeDescription: true,
                styleNotes: true,
                description: true,
                budgetRange: true,
                referencesNotes: true,
                preferredDateFrom: true,
                preferredDateTo: true,
                preferredTimeOfDay: true,
                preferredDaysNote: true,
                preferredArtistName: true,
                studioChooses: true,
                uploads: {
                    select: {
                        id: true,
                        kind: true,
                        secureUrl: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                medicalDeclaration: true,
                consent: true,
            },
        });
        if (!booking)
            throw new common_1.NotFoundException('BookingRequest not found');
        return booking;
    }
    async updatePublicIntake(bookingRequestId, dto) {
        const booking = await this.prisma.bookingRequest.findUnique({
            where: { id: bookingRequestId },
            select: { id: true, status: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('BookingRequest not found');
        const ALLOWED_EDIT_STATUSES = new Set(['PENDING_CONSULT']);
        if (!ALLOWED_EDIT_STATUSES.has(booking.status)) {
            throw new common_1.BadRequestException(`This booking cannot be edited at its current status (${booking.status})`);
        }
        const preferredDateFrom = dto.preferredDateFrom
            ? new Date(dto.preferredDateFrom)
            : undefined;
        const preferredDateTo = dto.preferredDateTo
            ? new Date(dto.preferredDateTo)
            : undefined;
        if (preferredDateFrom && Number.isNaN(preferredDateFrom.getTime())) {
            throw new common_1.BadRequestException('Invalid preferredDateFrom');
        }
        if (preferredDateTo && Number.isNaN(preferredDateTo.getTime())) {
            throw new common_1.BadRequestException('Invalid preferredDateTo');
        }
        if (preferredDateFrom &&
            preferredDateTo &&
            preferredDateTo < preferredDateFrom) {
            throw new common_1.BadRequestException('preferredDateTo must be after preferredDateFrom');
        }
        await this.prisma.bookingRequest.update({
            where: { id: bookingRequestId },
            data: {
                placement: dto.placement,
                sizeDescription: dto.sizeDescription,
                styleNotes: dto.styleNotes,
                description: dto.description,
                budgetRange: dto.budgetRange,
                referencesNotes: dto.referencesNotes,
                preferredArtistName: dto.preferredArtistName,
                studioChooses: dto.studioChooses,
                preferredDateFrom,
                preferredDateTo,
                preferredTimeOfDay: dto.preferredTimeOfDay,
                preferredDaysNote: dto.preferredDaysNote,
            },
        });
        return this.getPublicIntake(bookingRequestId);
    }
    async listDailyAppointments(params) {
        const { date, timezone, status, bookingType, artistId, stationId } = params;
        let range;
        try {
            range = (0, zoned_date_range_1.getUtcRangeForZonedDate)(date, timezone);
        }
        catch {
            throw new common_1.BadRequestException('Invalid date or timezone');
        }
        const { startUtc, endUtc } = range;
        const where = {
            ...(status ? { status } : {}),
            ...(bookingType ? { bookingType } : {}),
            assignments: {
                some: {
                    role: client_1.AssignmentRole.PRIMARY,
                    startsAt: { gte: startUtc, lt: endUtc },
                    ...(artistId ? { artistId } : {}),
                    ...(stationId ? { stationId } : {}),
                },
            },
        };
        const items = await this.prisma.bookingRequest.findMany({
            where,
            include: {
                client: true,
                assignments: {
                    include: { artist: true, station: true },
                    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
                },
                uploads: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        items.sort((a, b) => {
            const aStart = a.assignments.find((x) => x.role === client_1.AssignmentRole.PRIMARY)
                ?.startsAt ?? new Date(8640000000000000);
            const bStart = b.assignments.find((x) => x.role === client_1.AssignmentRole.PRIMARY)
                ?.startsAt ?? new Date(8640000000000000);
            return aStart.getTime() - bStart.getTime();
        });
        return {
            date,
            timezone,
            range: { startUtc, endUtc },
            total: items.length,
            items,
        };
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        media_service_1.MediaService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map