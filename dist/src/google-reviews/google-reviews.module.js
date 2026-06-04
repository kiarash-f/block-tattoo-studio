"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleReviewsModule = void 0;
const common_1 = require("@nestjs/common");
const google_reviews_service_1 = require("./google-reviews.service");
const google_reviews_controller_1 = require("./google-reviews.controller");
let GoogleReviewsModule = class GoogleReviewsModule {
};
exports.GoogleReviewsModule = GoogleReviewsModule;
exports.GoogleReviewsModule = GoogleReviewsModule = __decorate([
    (0, common_1.Module)({
        providers: [google_reviews_service_1.GoogleReviewsService],
        controllers: [google_reviews_controller_1.GoogleReviewsController],
    })
], GoogleReviewsModule);
//# sourceMappingURL=google-reviews.module.js.map