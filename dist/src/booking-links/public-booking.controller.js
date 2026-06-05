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
exports.PublicBookingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_token_guard_1 = require("./guards/public-token.guard");
const token_scopes_guard_1 = require("./guards/token-scopes.guard");
const token_scopes_decorator_1 = require("./decorators/token-scopes.decorator");
const bookings_service_1 = require("../bookings/bookings.service");
const public_update_intake_dto_1 = require("./dto/public-update-intake.dto");
const platform_express_1 = require("@nestjs/platform-express");
const client_1 = require("@prisma/client");
const booking_links_uploads_service_1 = require("./uploads/booking-links-uploads.service");
const public_upload_dto_1 = require("./dto/public-upload.dto");
let PublicBookingController = class PublicBookingController {
    bookings;
    uploadSvc;
    constructor(bookings, uploadSvc) {
        this.bookings = bookings;
        this.uploadSvc = uploadSvc;
    }
    async getIntake(req) {
        const { bookingRequestId } = req.publicToken;
        return this.bookings.getPublicIntake(bookingRequestId);
    }
    async updateIntake(req, dto) {
        const { bookingRequestId } = req.publicToken;
        return this.bookings.updatePublicIntake(bookingRequestId, dto);
    }
    async upload(req, files, body) {
        if (!files?.length) {
            throw new common_1.BadRequestException('no files uploaded');
        }
        const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        for (const f of files) {
            if (!allowedMimeTypes.has(f.mimetype)) {
                throw new common_1.BadRequestException(`Invalid file type for "${f.originalname}". Got "${f.mimetype}". Allowed: image/jpeg, image/png, image/webp`);
            }
        }
        const { bookingRequestId, tokenId } = req.publicToken;
        const kind = body.kind && Object.values(client_1.UploadKind).includes(body.kind)
            ? body.kind
            : client_1.UploadKind.REFERENCE;
        return this.uploadSvc.uploadForBookingViaToken({
            bookingRequestId,
            tokenId,
            kind,
            note: body.note,
            files,
        });
    }
};
exports.PublicBookingController = PublicBookingController;
__decorate([
    (0, common_1.Get)('intake'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get intake data via token (requires VIEW)',
        description: 'Returns the booking request intake data for the client associated with this token. Requires the VIEW scope.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Intake data returned.' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired token.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Token lacks required VIEW scope.' }),
    (0, token_scopes_decorator_1.TokenScopes)('VIEW'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "getIntake", null);
__decorate([
    (0, common_1.Patch)('intake'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update intake via token (requires INTAKE_CONTINUE)',
        description: 'Allows the client to update their intake form (description, budget, preferred dates, etc.) via a tokenized link. Requires the INTAKE_CONTINUE scope.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Intake updated.' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired token.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Token lacks required INTAKE_CONTINUE scope.',
    }),
    (0, token_scopes_decorator_1.TokenScopes)('INTAKE_CONTINUE'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, public_update_intake_dto_1.PublicUpdateIntakeDto]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "updateIntake", null);
__decorate([
    (0, common_1.Post)('uploads'),
    (0, swagger_1.ApiOperation)({
        summary: 'Upload via token (requires UPLOAD)',
        description: 'Uploads reference or healed photos for a booking request using a tokenized link. Requires the UPLOAD scope.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Files uploaded successfully.' }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'No files provided or invalid file type.',
    }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Invalid or expired token.' }),
    (0, swagger_1.ApiResponse)({
        status: 403,
        description: 'Token lacks required UPLOAD scope.',
    }),
    (0, token_scopes_decorator_1.TokenScopes)('UPLOAD'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                kind: { type: 'string', enum: Object.values(client_1.UploadKind) },
                note: { type: 'string' },
                images: { type: 'array', items: { type: 'string', format: 'binary' } },
            },
            required: ['images'],
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10, {
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array, public_upload_dto_1.PublicUploadDto]),
    __metadata("design:returntype", Promise)
], PublicBookingController.prototype, "upload", null);
exports.PublicBookingController = PublicBookingController = __decorate([
    (0, swagger_1.ApiTags)('Public / Booking'),
    (0, common_1.Controller)('public/booking/:token'),
    (0, common_1.UseGuards)(public_token_guard_1.PublicTokenGuard, token_scopes_guard_1.TokenScopesGuard),
    (0, swagger_1.ApiParam)({
        name: 'token',
        required: true,
        description: 'Compound token: <id>.<secret>',
    }),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService,
        booking_links_uploads_service_1.BookingLinksUploadsService])
], PublicBookingController);
//# sourceMappingURL=public-booking.controller.js.map