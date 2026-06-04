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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const bookings_service_1 = require("./bookings.service");
const update_booking_status_dto_1 = require("./dto/update-booking-status.dto");
const list_bookings_query_dto_1 = require("./dto/list-bookings.query.dto");
class ScheduleTattooDto {
    scheduledDate;
    artistId;
    stationId;
    durationNote;
    notes;
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: '2026-05-20T14:00:00.000Z' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ScheduleTattooDto.prototype, "scheduledDate", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'artist-cuid' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleTattooDto.prototype, "artistId", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'station-cuid' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleTattooDto.prototype, "stationId", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: '3-4 hours' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], ScheduleTattooDto.prototype, "durationNote", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], ScheduleTattooDto.prototype, "notes", void 0);
let BookingsController = class BookingsController {
    bookings;
    constructor(bookings) {
        this.bookings = bookings;
    }
    list(query) {
        return this.bookings.list({
            status: query.status,
            q: query.q,
            page: query.page,
            limit: query.limit,
        });
    }
    createWalkIn(body, req, files) {
        const user = req.user;
        const tattooDate = new Date(body.tattooDate);
        if (Number.isNaN(tattooDate.getTime())) {
            throw new Error('Invalid tattooDate');
        }
        return this.bookings.createWalkIn(user.sub, {
            client: {
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email || undefined,
                phone: body.phone || undefined,
                instagram: body.instagram || undefined,
            },
            description: body.description,
            budgetRange: body.budgetRange || undefined,
            tattooDate,
            artistId: body.artistId,
            stationId: body.stationId || undefined,
            durationNote: body.durationNote || undefined,
            placement: body.placement || undefined,
            sizeDescription: body.sizeDescription || undefined,
            styleNotes: body.styleNotes || undefined,
        }, files?.images ?? []);
    }
    detail(id) {
        return this.bookings.detail(id);
    }
    updateStatus(id, dto, req) {
        const user = req.user;
        return this.bookings.updateStatus(id, user.sub, dto);
    }
    scheduleTattoo(id, dto) {
        return this.bookings.scheduleTattooSession(id, {
            scheduledDate: new Date(dto.scheduledDate),
            artistId: dto.artistId,
            stationId: dto.stationId,
            durationNote: dto.durationNote,
            notes: dto.notes,
        });
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all booking requests', description: 'Returns paginated list of all booking requests. Filterable by status, search query, page, and limit.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Paginated list of booking requests.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_bookings_query_dto_1.ListBookingsQueryDto]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('walk-in'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a walk-in booking (admin/tablet)',
        description: 'Creates a walk-in booking directly at TATTOO_SCHEDULED status. ' +
            'Accepts basic client info, tattoo date, artist, and optional reference images. ' +
            'Returns an upload token so the client can add more images on the tablet.',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['firstName', 'lastName', 'description', 'tattooDate', 'artistId'],
            properties: {
                firstName: { type: 'string', example: 'Jane' },
                lastName: { type: 'string', example: 'Doe' },
                email: { type: 'string', example: 'jane@example.com' },
                phone: { type: 'string', example: '+49123456789' },
                instagram: { type: 'string', example: '@jane' },
                description: { type: 'string', example: 'Small rose on wrist' },
                placement: { type: 'string', example: 'left wrist' },
                sizeDescription: { type: 'string', example: '5x5 cm' },
                styleNotes: { type: 'string', example: 'blackwork' },
                tattooDate: { type: 'string', format: 'date-time', example: '2026-04-14T14:00:00.000Z', description: 'ISO date — use today for same-day tattoo' },
                artistId: { type: 'string' },
                stationId: { type: 'string' },
                budgetRange: { type: 'string', enum: ['UNDER_200', 'B200_400', 'B400_700', 'B700_1000', 'B1000_1500', 'B1500_2000', 'OVER_2000'], example: 'B200_400', description: 'Client budget range (optional, defaults to UNDER_200)' },
                durationNote: { type: 'string', example: '2-3 hours' },
                images: { type: 'array', items: { type: 'string', format: 'binary' }, description: 'Reference images (optional)' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Walk-in created. Returns bookingId and upload token for tablet.' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([{ name: 'images', maxCount: 10 }], {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "createWalkIn", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get booking request detail', description: 'Returns full detail of a single booking request including client info, assignments, uploads, tattoo sessions, and scheduling.' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Booking request found.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking request not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "detail", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update booking status',
        description: 'Valid transitions: PENDING_CONSULT → CONSULT_APPROVED | CANCELLED. ' +
            'CONSULT_APPROVED → CONSULT_NO_SHOW | CANCELLED. ' +
            'TATTOO_SCHEDULED → COMPLETED | CANCELLED. ' +
            'To move to TATTOO_SCHEDULED use POST /:id/schedule-tattoo.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiBody)({ type: update_booking_status_dto_1.UpdateBookingStatusDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Status updated.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid transition.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_status_dto_1.UpdateBookingStatusDto, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/schedule-tattoo'),
    (0, swagger_1.ApiOperation)({
        summary: 'Schedule tattoo session after consultation',
        description: 'Creates a TattooSession and moves the booking from CONSULT_APPROVED → TATTOO_SCHEDULED. ' +
            'If scheduledDate is today the client should fill medical/consent immediately after.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiBody)({ type: ScheduleTattooDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Tattoo session scheduled.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Booking not in CONSULT_APPROVED status.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ScheduleTattooDto]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "scheduleTattoo", null);
exports.BookingsController = BookingsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Bookings'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('admin/bookings'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map