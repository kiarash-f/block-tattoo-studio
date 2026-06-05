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
exports.GoogleReviewsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const google_reviews_service_1 = require("./google-reviews.service");
let GoogleReviewsController = class GoogleReviewsController {
    service;
    constructor(service) {
        this.service = service;
    }
    getReviews() {
        return this.service.getReviews();
    }
};
exports.GoogleReviewsController = GoogleReviewsController;
__decorate([
    (0, common_1.Get)('google'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get cached Google reviews for the studio',
        description: 'Returns cached Google Maps reviews for the studio. Results are refreshed periodically to avoid exceeding API quota.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of Google reviews.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GoogleReviewsController.prototype, "getReviews", null);
exports.GoogleReviewsController = GoogleReviewsController = __decorate([
    (0, swagger_1.ApiTags)('Public / Reviews'),
    (0, common_1.Controller)('public/reviews'),
    __metadata("design:paramtypes", [google_reviews_service_1.GoogleReviewsService])
], GoogleReviewsController);
//# sourceMappingURL=google-reviews.controller.js.map