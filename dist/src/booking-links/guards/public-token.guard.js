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
exports.PublicTokenGuard = void 0;
const common_1 = require("@nestjs/common");
const booking_links_service_1 = require("../booking-links.service");
let PublicTokenGuard = class PublicTokenGuard {
    bookingLinks;
    constructor(bookingLinks) {
        this.bookingLinks = bookingLinks;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const raw = req.params?.token;
        if (!raw || Array.isArray(raw)) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
        const compoundToken = raw;
        try {
            const validated = await this.bookingLinks.validateToken(compoundToken);
            req.publicToken = validated;
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
};
exports.PublicTokenGuard = PublicTokenGuard;
exports.PublicTokenGuard = PublicTokenGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [booking_links_service_1.BookingLinksService])
], PublicTokenGuard);
//# sourceMappingURL=public-token.guard.js.map