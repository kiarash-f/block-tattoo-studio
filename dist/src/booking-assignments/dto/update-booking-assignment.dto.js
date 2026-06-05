"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBookingAssignmentDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_booking_assignment_dto_1 = require("./create-booking-assignment.dto");
class UpdateBookingAssignmentDto extends (0, mapped_types_1.PartialType)(create_booking_assignment_dto_1.CreateBookingAssignmentDto) {
}
exports.UpdateBookingAssignmentDto = UpdateBookingAssignmentDto;
//# sourceMappingURL=update-booking-assignment.dto.js.map