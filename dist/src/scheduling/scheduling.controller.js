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
exports.PublicAvailabilityController = exports.AdminSessionActionsController = exports.AdminTattooSessionsController = exports.AdminBookingConsultController = exports.AdminConsultSlotsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const scheduling_service_1 = require("./scheduling.service");
const create_consult_slot_dto_1 = require("./dto/create-consult-slot.dto");
const assign_consult_slot_dto_1 = require("./dto/assign-consult-slot.dto");
const create_tattoo_session_dto_1 = require("./dto/create-tattoo-session.dto");
const update_tattoo_session_dto_1 = require("./dto/update-tattoo-session.dto");
let AdminConsultSlotsController = class AdminConsultSlotsController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(dto) {
        return this.service.createConsultSlot(dto);
    }
    list() {
        return this.service.listConsultSlots();
    }
    remove(id) {
        return this.service.deleteConsultSlot(id);
    }
};
exports.AdminConsultSlotsController = AdminConsultSlotsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a consult slot for a date', description: 'Creates a new consultation slot with a defined capacity. Clients can be assigned to available slots during the booking process.' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Consult slot created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_consult_slot_dto_1.CreateConsultSlotDto]),
    __metadata("design:returntype", void 0)
], AdminConsultSlotsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all consult slots with booking counts', description: 'Returns all consult slots with their capacity, remaining availability, and number of bookings assigned.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of consult slots.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminConsultSlotsController.prototype, "list", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a consult slot (only if no bookings assigned)', description: 'Permanently deletes a consult slot. Fails if any bookings are already assigned to this slot.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Consult slot ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Slot deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot delete — bookings are assigned to this slot.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Slot not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminConsultSlotsController.prototype, "remove", null);
exports.AdminConsultSlotsController = AdminConsultSlotsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Consult Slots'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('admin/consult-slots'),
    __metadata("design:paramtypes", [scheduling_service_1.SchedulingService])
], AdminConsultSlotsController);
let AdminBookingConsultController = class AdminBookingConsultController {
    service;
    constructor(service) {
        this.service = service;
    }
    assign(id, dto) {
        return this.service.assignConsultSlot(id, dto);
    }
};
exports.AdminBookingConsultController = AdminBookingConsultController;
__decorate([
    (0, common_1.Patch)(':id/assign-consult'),
    (0, swagger_1.ApiOperation)({ summary: 'Assign a consult slot to a booking', description: 'Assigns a specific consult slot to a booking request, decrementing the slot capacity. Sends a confirmation email to the client.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'BookingRequest ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Consult slot assigned.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Slot is fully booked or booking is in wrong status.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking request or slot not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_consult_slot_dto_1.AssignConsultSlotDto]),
    __metadata("design:returntype", void 0)
], AdminBookingConsultController.prototype, "assign", null);
exports.AdminBookingConsultController = AdminBookingConsultController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Consult Slots'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('admin/bookings'),
    __metadata("design:paramtypes", [scheduling_service_1.SchedulingService])
], AdminBookingConsultController);
let AdminTattooSessionsController = class AdminTattooSessionsController {
    service;
    constructor(service) {
        this.service = service;
    }
    create(id, dto) {
        return this.service.createTattooSession(id, dto);
    }
    list(id) {
        return this.service.listTattooSessions(id);
    }
};
exports.AdminTattooSessionsController = AdminTattooSessionsController;
__decorate([
    (0, common_1.Post)(':id/sessions'),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a tattoo session for a booking (station auto-resolved)',
        description: 'Creates a scheduled tattoo session for a booking. The studio station is auto-resolved from the booking assignment if not specified.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'BookingRequest ID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Tattoo session created.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Booking request not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_tattoo_session_dto_1.CreateTattooSessionDto]),
    __metadata("design:returntype", void 0)
], AdminTattooSessionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id/sessions'),
    (0, swagger_1.ApiOperation)({ summary: 'List all tattoo sessions for a booking', description: 'Returns all scheduled tattoo sessions for a specific booking request, ordered by date.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'BookingRequest ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of tattoo sessions.' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminTattooSessionsController.prototype, "list", null);
exports.AdminTattooSessionsController = AdminTattooSessionsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Tattoo Sessions'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('admin/bookings'),
    __metadata("design:paramtypes", [scheduling_service_1.SchedulingService])
], AdminTattooSessionsController);
let AdminSessionActionsController = class AdminSessionActionsController {
    service;
    constructor(service) {
        this.service = service;
    }
    update(sessionId, dto) {
        return this.service.updateTattooSession(sessionId, dto);
    }
    complete(sessionId) {
        return this.service.completeTattooSession(sessionId);
    }
    remove(sessionId) {
        return this.service.deleteTattooSession(sessionId);
    }
};
exports.AdminSessionActionsController = AdminSessionActionsController;
__decorate([
    (0, common_1.Patch)(':sessionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a tattoo session', description: 'Updates the scheduled date, duration, station, or notes for a tattoo session.' }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'Tattoo session ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Session updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Session not found.' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_tattoo_session_dto_1.UpdateTattooSessionDto]),
    __metadata("design:returntype", void 0)
], AdminSessionActionsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':sessionId/complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark a tattoo session as completed', description: 'Sets the tattoo session status to COMPLETED and sends a session reminder/follow-up email to the client.' }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'Tattoo session ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Session marked as completed.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Session not found.' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminSessionActionsController.prototype, "complete", null);
__decorate([
    (0, common_1.Delete)(':sessionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a tattoo session', description: 'Permanently deletes a tattoo session.' }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'Tattoo session ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Session deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Session not found.' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminSessionActionsController.prototype, "remove", null);
exports.AdminSessionActionsController = AdminSessionActionsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Tattoo Sessions'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('admin/sessions'),
    __metadata("design:paramtypes", [scheduling_service_1.SchedulingService])
], AdminSessionActionsController);
let PublicAvailabilityController = class PublicAvailabilityController {
    service;
    constructor(service) {
        this.service = service;
    }
    getAvailableDates() {
        return this.service.getAvailableConsultDates();
    }
};
exports.PublicAvailabilityController = PublicAvailabilityController;
__decorate([
    (0, common_1.Get)('consults'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get available consult dates (dates with remaining capacity)',
        description: 'Returns a list of upcoming consult dates that still have open capacity. Used by the public booking form to let clients select a preferred consultation date.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of available consult dates.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicAvailabilityController.prototype, "getAvailableDates", null);
exports.PublicAvailabilityController = PublicAvailabilityController = __decorate([
    (0, swagger_1.ApiTags)('Public / Availability'),
    (0, common_1.Controller)('public/availability'),
    __metadata("design:paramtypes", [scheduling_service_1.SchedulingService])
], PublicAvailabilityController);
//# sourceMappingURL=scheduling.controller.js.map