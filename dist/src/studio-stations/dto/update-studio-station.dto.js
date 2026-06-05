"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateStudioStationDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_studio_station_dto_1 = require("./create-studio-station.dto");
class UpdateStudioStationDto extends (0, mapped_types_1.PartialType)(create_studio_station_dto_1.CreateStudioStationDto) {
}
exports.UpdateStudioStationDto = UpdateStudioStationDto;
//# sourceMappingURL=update-studio-station.dto.js.map