import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
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

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // Google Reviews
  GOOGLE_PLACES_API_KEY: Joi.string().optional().allow(''),
  GOOGLE_PLACE_ID: Joi.string().optional().allow(''),
  GOOGLE_REVIEWS_CACHE_TTL: Joi.number().default(3600),

  // Transactional Email (Resend)
  RESEND_API_KEY: Joi.string().optional().allow(''),
  EMAIL_FROM: Joi.string().optional().allow(''),
  STUDIO_NAME: Joi.string().optional().default('Tattoo Studio'),
  STUDIO_ADDRESS: Joi.string().optional().allow(''),
  STUDIO_PHONE: Joi.string().optional().allow(''),
  STUDIO_WEBSITE: Joi.string().optional().allow(''),
}).unknown(true);
