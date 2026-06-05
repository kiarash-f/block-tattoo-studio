"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.envValidationSchema = void 0;
const Joi = __importStar(require("joi"));
exports.envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'test', 'production')
        .default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required(),
    ADMIN_JWT_SECRET: Joi.string().required(),
    ADMIN_JWT_EXPIRES_IN: Joi.string().default('1d'),
    CLOUDINARY_CLOUD_NAME: Joi.string().required(),
    CLOUDINARY_API_KEY: Joi.string().required(),
    CLOUDINARY_API_SECRET: Joi.string().required(),
    CLOUDINARY_FOLDER: Joi.string().default('tattoo-studio/booking-requests'),
    PUBLIC_BASE_URL: Joi.string().uri().required(),
    BOOKING_LINK_TOKEN_PEPPER: Joi.string().min(32).required(),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().optional().allow(''),
    GOOGLE_PLACES_API_KEY: Joi.string().optional().allow(''),
    GOOGLE_PLACE_ID: Joi.string().optional().allow(''),
    GOOGLE_REVIEWS_CACHE_TTL: Joi.number().default(3600),
    ANTHROPIC_API_KEY: Joi.string().optional().allow(''),
    DEEPL_API_KEY: Joi.string().required(),
    STRIPE_SECRET_KEY: Joi.string().required(),
    STRIPE_WEBHOOK_SECRET: Joi.string().required(),
    RESEND_API_KEY: Joi.string().optional().allow(''),
    EMAIL_FROM: Joi.string().optional().allow(''),
    STUDIO_NAME: Joi.string().optional().default('Tattoo Studio'),
    STUDIO_ADDRESS: Joi.string().optional().allow(''),
    STUDIO_PHONE: Joi.string().optional().allow(''),
    STUDIO_WEBSITE: Joi.string().optional().allow(''),
}).unknown(true);
//# sourceMappingURL=env.validation.js.map