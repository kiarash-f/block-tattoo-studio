"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticlesModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("../prisma/prisma.module");
const media_module_1 = require("../media/media.module");
const articles_service_1 = require("./articles.service");
const admin_articles_controller_1 = require("./admin-articles.controller");
const public_articles_controller_1 = require("./public-articles.controller");
const translation_module_1 = require("../translation/translation.module");
let ArticlesModule = class ArticlesModule {
};
exports.ArticlesModule = ArticlesModule;
exports.ArticlesModule = ArticlesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, media_module_1.MediaModule, translation_module_1.TranslationModule],
        providers: [articles_service_1.ArticlesService],
        controllers: [admin_articles_controller_1.AdminArticlesController, public_articles_controller_1.PublicArticlesController],
    })
], ArticlesModule);
//# sourceMappingURL=articles.module.js.map