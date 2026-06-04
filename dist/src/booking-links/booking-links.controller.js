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
exports.BookingLinksController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const booking_links_service_1 = require("./booking-links.service");
const create_booking_link_dto_1 = require("./dto/create-booking-link.dto");
let BookingLinksController = class BookingLinksController {
    tokens;
    constructor(tokens) {
        this.tokens = tokens;
    }
    async createBookingLink(bookingRequestId, dto, req) {
        const user = req.user;
        const result = await this.tokens.createToken({
            bookingRequestId,
            scopes: dto.scopes,
            expiresAt: new Date(dto.expiresAt),
            createdByAdminId: user.sub,
        });
        return {
            bookingRequestId,
            ...result,
        };
    }
};
exports.BookingLinksController = BookingLinksController;
__decorate([
    (0, common_1.Post)(':id/links'),
    (0, swagger_1.ApiOperation)({ summary: 'Create tokenized booking link (admin)', description: 'Generates a short-lived, scoped token URL that allows a client to take specific actions on their booking request without logging in.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'BookingRequest ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Booking link created. Returns token and expiry.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking request not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_booking_link_dto_1.CreateBookingLinkDto, Object]),
    __metadata("design:returntype", Promise)
], BookingLinksController.prototype, "createBookingLink", null);
exports.BookingLinksController = BookingLinksController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Booking Links'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('admin/booking-requests'),
    __metadata("design:paramtypes", [booking_links_service_1.BookingLinksService])
], BookingLinksController);
//# sourceMappingURL=booking-links.controller.js.map