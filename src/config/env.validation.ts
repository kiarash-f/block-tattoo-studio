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
}).unknown(true);
