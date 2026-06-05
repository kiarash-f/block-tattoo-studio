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
exports.AdminBookingRequestsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const in_studio_form_dto_1 = require("./dto/in-studio-form.dto");
const admin_booking_requests_service_1 = require("./admin-booking-requests.service");
let AdminBookingRequestsController = class AdminBookingRequestsController {
    service;
    constructor(service) {
        this.service = service;
    }
    checkIn(id, req) {
        const adminId = req.user?.sub;
        return this.service.checkIn(id, adminId);
    }
    getInStudioForm(id) {
        return this.service.getInStudioForm(id);
    }
    submitInStudioForm(id, req, dto) {
        const adminId = req.user?.sub;
        return this.service.submitInStudioForm(id, adminId, dto);
    }
};
exports.AdminBookingRequestsController = AdminBookingRequestsController;
__decorate([
    (0, common_1.Post)(':id/check-in'),
    (0, swagger_1.ApiOperation)({
        summary: 'Check in client on arrival',
        description: 'Marks the client as checked in to the studio. Sets checkedInAt timestamp and records which admin performed the check-in.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Client checked in successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking request not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminBookingRequestsController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Get)(':id/in-studio-form'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get in-studio medical and consent form',
        description: 'Returns the current state of the medical declaration and consent form for a booking. Returns null for each if not yet submitted.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Form state returned.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking request not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminBookingRequestsController.prototype, "getInStudioForm", null);
__decorate([
    (0, common_1.Put)(':id/in-studio-form'),
    (0, swagger_1.ApiOperation)({
        summary: 'Submit in-studio medical and consent form',
        description: 'Admin submits the medical declaration and consent form on behalf of the client during the studio visit. Overwrites any existing submission.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Form submitted successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking request not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, in_studio_form_dto_1.SubmitInStudioFormDto]),
    __metadata("design:returntype", void 0)
], AdminBookingRequestsController.prototype, "submitInStudioForm", null);
exports.AdminBookingRequestsController = AdminBookingRequestsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Bookings'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.Controller)('admin/booking-requests'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [admin_booking_requests_service_1.AdminBookingRequestsService])
], AdminBookingRequestsController);
//# sourceMappingURL=admin-booking-requests.controller.js.map