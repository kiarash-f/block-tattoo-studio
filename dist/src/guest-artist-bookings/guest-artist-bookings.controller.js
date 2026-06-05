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
exports.GuestBookingsAdminController = exports.GuestBookingsPublicController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const guest_artist_bookings_service_1 = require("./guest-artist-bookings.service");
const create_guest_booking_dto_1 = require("./dto/create-guest-booking.dto");
const update_guest_booking_dto_1 = require("./dto/update-guest-booking.dto");
const list_guest_bookings_query_dto_1 = require("./dto/list-guest-bookings.query.dto");
const availability_query_dto_1 = require("./dto/availability-query.dto");
let GuestBookingsPublicController = class GuestBookingsPublicController {
    service;
    constructor(service) {
        this.service = service;
    }
    getAvailability(query) {
        return this.service.getAvailability(query.startDate, query.endDate);
    }
    create(dto) {
        return this.service.create(dto);
    }
};
exports.GuestBookingsPublicController = GuestBookingsPublicController;
__decorate([
    (0, common_1.Get)('availability'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get table availability for a date range',
        description: 'Returns available tables per day for the requested range. ' +
            'Days where availableTables = 0 are fully booked.',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        required: true,
        example: '2026-06-01',
        description: 'ISO date YYYY-MM-DD',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        required: true,
        example: '2026-06-30',
        description: 'ISO date YYYY-MM-DD',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Availability per day.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid date range.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [availability_query_dto_1.AvailabilityQueryDto]),
    __metadata("design:returntype", void 0)
], GuestBookingsPublicController.prototype, "getAvailability", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a guest artist booking',
        description: 'Books one or more tables for a guest artist. ' +
            'Validates availability for every day in the range. ' +
            'A 10% discount is applied automatically when the booking is 30+ days. ' +
            'Returns the booking details and a Shopify checkout URL (payment link).',
    }),
    (0, swagger_1.ApiBody)({ type: create_guest_booking_dto_1.CreateGuestBookingDto }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Booking created. Check shopifyCheckoutUrl for payment.',
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Validation failed or not enough tables available.',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Station config not set up yet.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_guest_booking_dto_1.CreateGuestBookingDto]),
    __metadata("design:returntype", void 0)
], GuestBookingsPublicController.prototype, "create", null);
exports.GuestBookingsPublicController = GuestBookingsPublicController = __decorate([
    (0, swagger_1.ApiTags)('Guest Artist Bookings'),
    (0, common_1.Controller)('guest-bookings'),
    __metadata("design:paramtypes", [guest_artist_bookings_service_1.GuestArtistBookingsService])
], GuestBookingsPublicController);
let GuestBookingsAdminController = class GuestBookingsAdminController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(query) {
        return this.service.list(query);
    }
    detail(id) {
        return this.service.detail(id);
    }
    update(id, dto) {
        return this.service.update(id, dto);
    }
    remove(id) {
        return this.service.remove(id);
    }
};
exports.GuestBookingsAdminController = GuestBookingsAdminController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List all guest artist bookings',
        description: 'Returns all bookings. Filterable by status and date range.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of bookings.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_guest_bookings_query_dto_1.ListGuestBookingsQueryDto]),
    __metadata("design:returntype", void 0)
], GuestBookingsAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single guest booking' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Booking detail.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GuestBookingsAdminController.prototype, "detail", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a guest booking',
        description: 'Edit any field on a guest booking. ' +
            'If dates or numberOfTables change, totalPrice is automatically recalculated.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiBody)({ type: update_guest_booking_dto_1.UpdateGuestBookingDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Booking updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_guest_booking_dto_1.UpdateGuestBookingDto]),
    __metadata("design:returntype", void 0)
], GuestBookingsAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a guest booking' }),
    (0, swagger_1.ApiParam)({ name: 'id' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Booking deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GuestBookingsAdminController.prototype, "remove", null);
exports.GuestBookingsAdminController = GuestBookingsAdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Guest Bookings'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('admin/guest-bookings'),
    __metadata("design:paramtypes", [guest_artist_bookings_service_1.GuestArtistBookingsService])
], GuestBookingsAdminController);
//# sourceMappingURL=guest-artist-bookings.controller.js.map