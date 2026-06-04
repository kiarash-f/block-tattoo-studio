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
exports.AdminAppointmentsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const bookings_service_1 = require("./bookings.service");
const list_appointments_query_dto_1 = require("./dto/list-appointments.query.dto");
let AdminAppointmentsController = class AdminAppointmentsController {
    bookings;
    constructor(bookings) {
        this.bookings = bookings;
    }
    list(query) {
        return this.bookings.listDailyAppointments({
            date: query.date,
            timezone: query.timezone ?? 'Europe/Berlin',
            status: query.status,
            bookingType: query.bookingType,
            artistId: query.artistId,
            stationId: query.stationId,
        });
    }
};
exports.AdminAppointmentsController = AdminAppointmentsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List appointments for a specific day', description: 'Returns all bookings that have a PRIMARY assignment with a startsAt on the given date. Used for the admin daily schedule view. Requires date (YYYY-MM-DD) query param.' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of appointments for the day.' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_appointments_query_dto_1.ListAppointmentsQueryDto]),
    __metadata("design:returntype", void 0)
], AdminAppointmentsController.prototype, "list", null);
exports.AdminAppointmentsController = AdminAppointmentsController = __decorate([
    (0, swagger_1.ApiTags)('Admin / Bookings'),
    (0, swagger_1.ApiBearerAuth)('admin-jwt'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('admin/appointments'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService])
], AdminAppointmentsController);
//# sourceMappingURL=admin-appointments.controller.js.map