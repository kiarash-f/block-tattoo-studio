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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingLinksUploadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const media_service_1 = require("../../media/media.service");
let BookingLinksUploadsService = class BookingLinksUploadsService {
    prisma;
    media;
    constructor(prisma, media) {
        this.prisma = prisma;
        this.media = media;
    }
    async uploadForBookingViaToken(params) {
        const booking = await this.prisma.bookingRequest.findUnique({
            where: { id: params.bookingRequestId },
            select: { id: true, status: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('BookingRequest not found');
        const ALLOWED_UPLOAD_STATUSES = new Set([
            'PENDING_CONSULT',
            'CONSULT_APPROVED',
            'TATTOO_SCHEDULED',
        ]);
        if (!ALLOWED_UPLOAD_STATUSES.has(booking.status)) {
            throw new common_1.BadRequestException(`Uploads are not allowed at current status (${booking.status})`);
        }
        const uploaded = await Promise.all(params.files.map((file) => this.media.uploadBuffer(file.buffer, {
            folder: `tattoo/booking/${booking.id}`,
            filename: file.originalname,
        })));
        const created = await this.prisma.$transaction(uploaded.map((u, idx) => {
            const f = params.files[idx];
            return this.prisma.upload.create({
                data: {
                    bookingRequestId: booking.id,
                    kind: params.kind,
                    originalName: f.originalname,
                    mimeType: f.mimetype,
                    bytes: f.size,
                    cloudinaryPublicId: u.publicId,
                    secureUrl: u.secureUrl,
                    createdViaTokenId: params.tokenId,
                },
                select: {
                    id: true,
                    kind: true,
                    secureUrl: true,
                    createdAt: true,
                    originalName: true,
                    mimeType: true,
                    bytes: true,
                },
            });
        }));
        return {
            inserted: created.length,
            note: params.note ?? null,
            uploads: created,
        };
    }
};
exports.BookingLinksUploadsService = BookingLinksUploadsService;
exports.BookingLinksUploadsService = BookingLinksUploadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        media_service_1.MediaService])
], BookingLinksUploadsService);
//# sourceMappingURL=booking-links-uploads.service.js.map