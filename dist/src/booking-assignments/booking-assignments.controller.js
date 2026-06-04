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
exports.BookingAssignmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const booking_assignments_service_1 = require("./booking-assignments.service");
const create_booking_assignment_dto_1 = require("./dto/create-booking-assignment.dto");
const update_booking_assignment_dto_1 = require("./dto/update-booking-assignment.dto");
const passport_1 = require("@nestjs/passport");
let BookingAssignmentsController = class BookingAssignmentsController {
    assignments;
    constructor(assignments) {
        this.assignments = assignments;
    }
    create(bookingRequestId, dto) {
        return this.assignments.create(bookingRequestId, dto);
    }
    list(bookingRequestId) {
        return this.assignments.list(bookingRequestId);
    }
    update(bookingRequestId, assignmentId, dto) {
        return this.assignments.update(bookingRequestId, assignmentId, dto);
    }
    remove(bookingRequestId, assignmentId) {
        return this.assignments.remove(bookingRequestId, assignmentId);
    }
};
exports.BookingAssignmentsController = BookingAssignmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create assignment for a booking request', description: 'Assigns an artist and/or studio station to a booking request for a specific session date.' }),
    (0, swagger_1.ApiParam)({
        name: 'bookingRequestId',
        description: 'BookingRequest ID (uuid)',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Assignment created' }),
    __param(0, (0, common_1.Param)('bookingRequestId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_booking_assignment_dto_1.CreateBookingAssignmentDto]),
    __metadata("design:returntype", void 0)
], BookingAssignmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List assignments for a booking request', description: 'Returns all artist/station assignments associated with the given booking request.' }),
    (0, swagger_1.ApiParam)({
        name: 'bookingRequestId',
        description: 'BookingRequest ID (uuid)',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of assignments.' }),
    __param(0, (0, common_1.Param)('bookingRequestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingAssignmentsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':assignmentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update assignment', description: 'Updates the artist, station, or session details for an existing assignment.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Assignment updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Assignment not found.' }),
    (0, swagger_1.ApiParam)({
        name: 'bookingRequestId',
        description: 'BookingRequest ID (uuid)',
    }),
    (0, swagger_1.ApiParam)({ name: 'assignmentId', description: 'Assignment ID (cuid)' }),
    __param(0, (0, common_1.Param)('bookingRequestId')),
    __param(1, (0, common_1.Param)('assignmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_booking_assignment_dto_1.UpdateBookingAssignmentDto]),
    __metadata("design:returntype", void 0)
], BookingAssignmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':assignmentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete assignment', description: 'Removes an artist/station assignment from a booking request.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Assignment deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Assignment not found.' }),
    (0, swagger_1.ApiParam)({
        name: 'bookingRequestId',
        description: 'BookingRequest ID (uuid)',
    }),
    (0, swagger_1.ApiParam)({ name: 'assignmentId', description: 'Assignment ID (cuid)' }),
    __param(0, (0, common_1.Param)('bookingRequestId')),
    __param(1, (0, common_1.Param)('assignmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BookingAssignmentsController.prototype, "remove", null);
exports.BookingAssignmentsController = BookingAssignmentsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Booking Assignments'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.Controller)('booking-requests/:bookingRequestId/assignments'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [booking_assignments_service_1.BookingAssignmentsService])
], BookingAssignmentsController);
//# sourceMappingURL=booking-assignments.controller.js.map