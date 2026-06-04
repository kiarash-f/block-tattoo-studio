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
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const public_service_1 = require("./public.service");
const booking_intake_dto_1 = require("./dto/booking-intake.dto");
const throttler_1 = require("@nestjs/throttler");
let PublicController = class PublicController {
    publicService;
    constructor(publicService) {
        this.publicService = publicService;
    }
    async bookingIntake(body, files, query, headers) {
        const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
        for (const f of files ?? []) {
            if (!allowedMimeTypes.has(f.mimetype)) {
                throw new common_1.BadRequestException(`Invalid file type for "${f.originalname}". Got "${f.mimetype}". Allowed: image/jpeg, image/png, image/webp`);
            }
        }
        const parsed = {
            client: {
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email || undefined,
                phone: body.phone || undefined,
                instagram: body.instagram || undefined,
                birthday: body.birthday || undefined,
            },
            bookingRequest: {
                consultDate: body.consultDate,
                description: body.description,
                budgetRange: body.budgetRange,
                bookingType: body.bookingType || 'APPOINTMENT',
                placement: body.placement || undefined,
                sizeDescription: body.sizeDescription || undefined,
                styleNotes: body.styleNotes || undefined,
                referencesNotes: body.referencesNotes || undefined,
                preferredArtistName: body.preferredArtistName || undefined,
                preferredDateFrom: body.preferredDateFrom || undefined,
                preferredDateTo: body.preferredDateTo || undefined,
                preferredTimeOfDay: body.preferredTimeOfDay || undefined,
                preferredDaysNote: body.preferredDaysNote || undefined,
            },
        };
        if (parsed.bookingRequest.bookingType === 'WALK_IN') {
            throw new common_1.BadRequestException('WALK_IN can only be created in the studio (kiosk).');
        }
        if (parsed.bookingRequest.preferredDateFrom || parsed.bookingRequest.preferredDateTo) {
            const from = parsed.bookingRequest.preferredDateFrom
                ? new Date(parsed.bookingRequest.preferredDateFrom)
                : null;
            const to = parsed.bookingRequest.preferredDateTo
                ? new Date(parsed.bookingRequest.preferredDateTo)
                : null;
            if (from && Number.isNaN(from.getTime()))
                throw new common_1.BadRequestException('Invalid preferredDateFrom');
            if (to && Number.isNaN(to.getTime()))
                throw new common_1.BadRequestException('Invalid preferredDateTo');
            if (from && to && to < from)
                throw new common_1.BadRequestException('preferredDateTo must be after preferredDateFrom');
            if (from)
                parsed.bookingRequest.preferredDateFrom = from.toISOString();
            if (to)
                parsed.bookingRequest.preferredDateTo = to.toISOString();
        }
        parsed.bookingRequest.utmCampaign ??= query.utm_campaign ?? query.utmCampaign;
        parsed.bookingRequest.utmAdset ??= query.utm_adset ?? query.utmAdset;
        parsed.bookingRequest.utmAd ??= query.utm_ad ?? query.utmAd;
        parsed.bookingRequest.referrer ??= headers['referer'] ?? headers['referrer'];
        parsed.bookingRequest.landingPath ??= headers['x-landing-path'] ?? query.landingPath;
        parsed.bookingRequest.source ??= query.source ?? booking_intake_dto_1.IntakeSource.DIRECT;
        if (typeof parsed.bookingRequest.preferredArtistName === 'string') {
            const trimmed = parsed.bookingRequest.preferredArtistName.trim();
            parsed.bookingRequest.preferredArtistName = trimmed.length ? trimmed : undefined;
        }
        if (!parsed.bookingRequest.preferredArtistName) {
            parsed.bookingRequest.studioChooses = true;
        }
        const dto = (0, class_transformer_1.plainToInstance)(booking_intake_dto_1.CreateBookingIntakeDto, parsed);
        const errors = (0, class_validator_1.validateSync)(dto, { whitelist: true, forbidNonWhitelisted: true });
        if (errors.length)
            throw new common_1.BadRequestException(errors);
        return this.publicService.createBookingIntake(dto, files ?? []);
    }
    getAvailability(month) {
        return this.publicService.getMonthAvailability(month);
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60 } }),
    (0, common_1.Post)('booking-intake'),
    (0, swagger_1.ApiOperation)({
        summary: 'Public booking intake',
        description: 'Submits a new booking request from the public website. ' +
            'Send as multipart/form-data. All fields are individual form fields. ' +
            'Optionally attach reference images via files[]. Sends a confirmation email to the client.',
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Booking intake submitted successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error.' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['firstName', 'lastName', 'consultDate', 'description', 'budgetRange'],
            properties: {
                firstName: {
                    type: 'string',
                    example: 'John',
                    description: '(required) Client first name',
                },
                lastName: {
                    type: 'string',
                    example: 'Doe',
                    description: '(required) Client last name',
                },
                email: {
                    type: 'string',
                    example: 'john@example.com',
                    description: '(optional) Client email — used for confirmation email',
                },
                phone: {
                    type: 'string',
                    example: '+1234567890',
                    description: '(optional) Client phone number',
                },
                instagram: {
                    type: 'string',
                    example: '@johndoe',
                    description: '(optional) Client Instagram handle',
                },
                birthday: {
                    type: 'string',
                    example: '1995-06-15',
                    description: '(optional) Client date of birth — ISO date YYYY-MM-DD',
                },
                consultDate: {
                    type: 'string',
                    example: '2026-05-10',
                    description: '(required) Chosen consult date — ISO date YYYY-MM-DD. Must be in the future and not a Sunday.',
                },
                description: {
                    type: 'string',
                    example: 'Small floral tattoo on wrist, black & grey style',
                    description: '(required) Description of the desired tattoo',
                },
                budgetRange: {
                    type: 'string',
                    enum: ['UNDER_200', '_200_400', '_400_700', '_700_1000', '_1000_1500', '_1500_2000', 'OVER_2000'],
                    example: '_200_400',
                    description: '(required) Client budget range',
                },
                bookingType: {
                    type: 'string',
                    enum: ['APPOINTMENT', 'CONSULTATION', 'COVER_UP'],
                    example: 'APPOINTMENT',
                    description: '(optional) Type of booking. Defaults to APPOINTMENT. WALK_IN is not allowed from public form.',
                },
                placement: {
                    type: 'string',
                    example: 'Left wrist',
                    description: '(optional) Where on the body the tattoo will go',
                },
                sizeDescription: {
                    type: 'string',
                    example: '5cm x 5cm',
                    description: '(optional) Approximate size of the tattoo',
                },
                styleNotes: {
                    type: 'string',
                    example: 'Fine line, minimalist',
                    description: '(optional) Style preferences',
                },
                referencesNotes: {
                    type: 'string',
                    example: 'See uploaded reference images',
                    description: '(optional) Notes about reference images or inspiration',
                },
                preferredArtistName: {
                    type: 'string',
                    example: 'Alex',
                    description: '(optional) Name of preferred artist. Leave empty to let the studio choose.',
                },
                preferredDateFrom: {
                    type: 'string',
                    example: '2026-06-01',
                    description: '(optional) Earliest preferred tattoo date — ISO date YYYY-MM-DD',
                },
                preferredDateTo: {
                    type: 'string',
                    example: '2026-07-01',
                    description: '(optional) Latest preferred tattoo date — ISO date YYYY-MM-DD',
                },
                preferredTimeOfDay: {
                    type: 'string',
                    enum: ['MORNING', 'AFTERNOON', 'EVENING', 'ANY'],
                    example: 'AFTERNOON',
                    description: '(optional) Preferred time of day for the tattoo appointment',
                },
                preferredDaysNote: {
                    type: 'string',
                    example: 'Prefer weekends',
                    description: '(optional) Free-text note about preferred days',
                },
                images: {
                    type: 'array',
                    description: '(optional) Reference images — max 10 files, max 10 MB each. Allowed: jpeg, png, webp.',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10, {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Query)()),
    __param(3, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array, Object, Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "bookingIntake", null);
__decorate([
    (0, common_1.Get)('availability'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get consult slot availability for a month',
        description: 'Returns each day of the requested month with its availability status. ' +
            'Sundays are always closed. Days with 3+ booked consults are marked "busy" but still bookable — the admin can approve beyond the soft limit.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, example: '2026-05', description: 'Month in YYYY-MM format' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Availability map for the month' }),
    __param(0, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getAvailability", null);
exports.PublicController = PublicController = __decorate([
    (0, swagger_1.ApiTags)('Public / Booking'),
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [public_service_1.PublicService])
], PublicController);
//# sourceMappingURL=public.controller.js.map