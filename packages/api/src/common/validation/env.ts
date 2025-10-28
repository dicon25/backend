import Joi from 'joi';

const requiredWhen = (field: string, schema: Joi.StringSchema = Joi.string()) => {
  return schema.when(field, {
    is:        true,
    then:      Joi.required(),
    otherwise: Joi.optional(),
  });
};

export const envValidationSchema = Joi.object({

  // Basic
  NODE_ENV: Joi.string().valid('local', 'development', 'production')
    .optional(),
  PORT: Joi.number().default(8000),

  // Database
  DATABASE_URL: Joi.string().uri()
    .required(),
  PRISMA_LOG_LEVEL: Joi.string().valid('query', 'info', 'warn', 'error')
    .default('warn'),

  // Redis
  REDIS_URL: Joi.string().uri()
    .required(),
  REDIS_FLUSH_ON_START: Joi.boolean().default(false),

  // JWT
  JWT_SECRET: Joi.string().min(32)
    .required(),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().required(),

  // CORS
  CORS_ORIGIN: Joi.string().uri()
    .default('http://localhost:3000'),

  // Frontend
  FRONTEND_URL: Joi.string().uri()
    .default('http://localhost:3000'),

  // S3
  S3_ENABLED:           Joi.boolean().default(false),
  S3_REGION:            requiredWhen('S3_ENABLED'),
  S3_ACCESS_KEY_ID:     requiredWhen('S3_ENABLED'),
  S3_SECRET_ACCESS_KEY: requiredWhen('S3_ENABLED'),
  S3_BUCKET_NAME:       requiredWhen('S3_ENABLED'),
  S3_ENDPOINT:          requiredWhen('S3_ENABLED'),

  // Sentry
  SENTRY_ENABLED: Joi.boolean().default(false),
  SENTRY_DSN:     requiredWhen('SENTRY_ENABLED', Joi.string().uri()),
});
