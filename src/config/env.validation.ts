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

  // Redis — REDIS_URL takes precedence over host/port/password when set
  REDIS_URL: Joi.string().uri().optional().allow(''),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // Observability (Sentry) — DSN unset silently disables Sentry; env/release
  // tag issues so prod and staging are distinguishable in the dashboard.
  SENTRY_DSN: Joi.string().uri().optional().allow(''),
  SENTRY_RELEASE: Joi.string().optional().allow(''),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).optional(),

  // Google Reviews
  GOOGLE_PLACES_API_KEY: Joi.string().optional().allow(''),
  GOOGLE_PLACE_ID: Joi.string().optional().allow(''),
  GOOGLE_REVIEWS_CACHE_TTL: Joi.number().default(3600),

  // Anthropic AI
  ANTHROPIC_API_KEY: Joi.string().optional().allow(''),

  // DeepL
  DEEPL_API_KEY: Joi.string().required(),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),

  // Swagger Basic Auth — /docs is protected in production (see main.ts), so
  // the credentials are mandatory there and optional elsewhere.
  SWAGGER_USER: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().allow(''),
  }),
  SWAGGER_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(12).required(),
    otherwise: Joi.string().optional().allow(''),
  }),

  // Payments — VAT rate in basis points (1900 = 19%), snapshotted onto each Payment
  VAT_RATE_BPS: Joi.number().integer().min(0).default(1900),

  // Transactional Email (Resend)
  RESEND_API_KEY: Joi.string().optional().allow(''),
  EMAIL_FROM: Joi.string().optional().allow(''),
  STUDIO_NAME: Joi.string().optional().default('Tattoo Studio'),
  STUDIO_ADDRESS: Joi.string().optional().allow(''),
  STUDIO_PHONE: Joi.string().optional().allow(''),
  STUDIO_WEBSITE: Joi.string().optional().allow(''),
}).unknown(true);
