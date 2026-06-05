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
exports.BookingAssignmentsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
let BookingAssignmentsService = class BookingAssignmentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(bookingRequestId, dto) {
        const role = dto.role ?? client_1.AssignmentRole.PRIMARY;
        const { startsAt, endsAt } = this.parseAndValidateTimeRange(dto.startsAt, dto.endsAt);
        return this.prisma.$transaction(async (tx) => {
            const bookingRequest = await tx.bookingRequest.findUnique({
                where: { id: bookingRequestId },
                select: { id: true },
            });
            if (!bookingRequest)
                throw new common_1.NotFoundException('BookingRequest not found');
            const artist = await tx.artist.findUnique({
                where: { id: dto.artistId },
                select: { id: true, status: true },
            });
            if (!artist)
                throw new common_1.NotFoundException('Artist not found');
            if (artist.status !== client_1.ArtistStatus.ACTIVE)
                throw new common_1.BadRequestException('Artist is not active');
            if (dto.stationId) {
                const station = await tx.studioStation.findUnique({
                    where: { id: dto.stationId },
                    select: { id: true, status: true },
                });
                if (!station)
                    throw new common_1.NotFoundException('Studio station not found');
                if (station.status !== client_1.StationStatus.ACTIVE)
                    throw new common_1.BadRequestException('Studio station is not active');
            }
            if (role === client_1.AssignmentRole.PRIMARY) {
                const existingPrimary = await tx.bookingAssignment.findFirst({
                    where: { bookingRequestId, role: client_1.AssignmentRole.PRIMARY },
                    select: { id: true },
                });
                if (existingPrimary) {
                    throw new common_1.BadRequestException('BookingRequest already has a PRIMARY assignment');
                }
            }
            return tx.bookingAssignment.create({
                data: {
                    bookingRequestId,
                    artistId: dto.artistId,
                    stationId: dto.stationId ?? null,
                    role,
                    startsAt,
                    endsAt,
                    note: dto.note,
                },
                include: {
                    artist: true,
                    station: true,
                },
            });
        });
    }
    async list(bookingRequestId) {
        const exists = await this.prisma.bookingRequest.findUnique({
            where: { id: bookingRequestId },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('BookingRequest not found');
        return this.prisma.bookingAssignment.findMany({
            where: { bookingRequestId },
            orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
            include: { artist: true, station: true },
        });
    }
    async update(bookingRequestId, assignmentId, dto) {
        const shouldValidateTimes = dto.startsAt !== undefined || dto.endsAt !== undefined;
        const parsedTimes = shouldValidateTimes
            ? this.parseAndValidateTimeRange(dto.startsAt, dto.endsAt)
            : null;
        return this.prisma.$transaction(async (tx) => {
            const assignment = await tx.bookingAssignment.findFirst({
                where: { id: assignmentId, bookingRequestId },
                select: { id: true, role: true },
            });
            if (!assignment)
                throw new common_1.NotFoundException('Assignment not found for this BookingRequest');
            const nextRole = dto.role ?? assignment.role;
            if (dto.artistId) {
                const artist = await tx.artist.findUnique({
                    where: { id: dto.artistId },
                    select: { id: true, status: true },
                });
                if (!artist)
                    throw new common_1.NotFoundException('Artist not found');
                if (artist.status !== client_1.ArtistStatus.ACTIVE)
                    throw new common_1.BadRequestException('Artist is not active');
            }
            if (dto.stationId !== undefined && dto.stationId !== null) {
                if (dto.stationId === '') {
                    throw new common_1.BadRequestException('stationId cannot be empty string');
                }
                if (dto.stationId) {
                    const station = await tx.studioStation.findUnique({
                        where: { id: dto.stationId },
                        select: { id: true, status: true },
                    });
                    if (!station)
                        throw new common_1.NotFoundException('Studio station not found');
                    if (station.status !== client_1.StationStatus.ACTIVE)
                        throw new common_1.BadRequestException('Studio station is not active');
                }
            }
            if (nextRole === client_1.AssignmentRole.PRIMARY &&
                assignment.role !== client_1.AssignmentRole.PRIMARY) {
                const existingPrimary = await tx.bookingAssignment.findFirst({
                    where: {
                        bookingRequestId,
                        role: client_1.AssignmentRole.PRIMARY,
                        id: { not: assignmentId },
                    },
                    select: { id: true },
                });
                if (existingPrimary)
                    throw new common_1.BadRequestException('BookingRequest already has a PRIMARY assignment');
            }
            return tx.bookingAssignment.update({
                where: { id: assignmentId },
                data: {
                    ...(dto.artistId !== undefined ? { artistId: dto.artistId } : {}),
                    ...(dto.stationId !== undefined
                        ? { stationId: dto.stationId ?? null }
                        : {}),
                    ...(dto.role !== undefined ? { role: dto.role } : {}),
                    ...(dto.note !== undefined ? { note: dto.note } : {}),
                    ...(shouldValidateTimes
                        ? {
                            startsAt: parsedTimes.startsAt,
                            endsAt: parsedTimes.endsAt,
                        }
                        : {}),
                },
                include: { artist: true, station: true },
            });
        });
    }
    async remove(bookingRequestId, assignmentId) {
        const existing = await this.prisma.bookingAssignment.findFirst({
            where: { id: assignmentId, bookingRequestId },
            select: { id: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('Assignment not found for this BookingRequest');
        return this.prisma.bookingAssignment.delete({
            where: { id: assignmentId },
        });
    }
    parseAndValidateTimeRange(startsAt, endsAt) {
        const hasStart = startsAt !== undefined && startsAt !== null;
        const hasEnd = endsAt !== undefined && endsAt !== null;
        if (!hasStart && !hasEnd)
            return { startsAt: null, endsAt: null };
        if (!hasStart && hasEnd) {
            throw new common_1.BadRequestException('startsAt must be provided when endsAt is set');
        }
        if (!startsAt)
            return { startsAt: null, endsAt: null };
        const s = new Date(startsAt);
        if (Number.isNaN(s.getTime())) {
            throw new common_1.BadRequestException('Invalid startsAt');
        }
        if (!hasEnd || !endsAt) {
            return { startsAt: s, endsAt: null };
        }
        const e = new Date(endsAt);
        if (Number.isNaN(e.getTime())) {
            throw new common_1.BadRequestException('Invalid endsAt');
        }
        if (e <= s) {
            throw new common_1.BadRequestException('endsAt must be after startsAt');
        }
        return { startsAt: s, endsAt: e };
    }
};
exports.BookingAssignmentsService = BookingAssignmentsService;
exports.BookingAssignmentsService = BookingAssignmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingAssignmentsService);
//# sourceMappingURL=booking-assignments.service.js.map