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
    .default('postgresql://postgres:postgres@localhost:5432/scholub'),
  PRISMA_LOG_LEVEL: Joi.string().valid('query', 'info', 'warn', 'error')
    .default('warn'),

  // Redis
  REDIS_URL: Joi.string().uri()
    .default('redis://localhost:6379'),
  REDIS_FLUSH_ON_START: Joi.boolean().default(false),

  // JWT
  JWT_SECRET: Joi.string().min(32)
    .default('dev-jwt-secret-key-change-this-in-production-min-32-chars'),

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

  // Crawler Secret Key
  CRAWLER_SECRET_KEY: Joi.string().min(32)
    .default('dev-crawler-secret-key-change-in-production-min-32-chars'),

  // AI Server Secret Key
  AI_SERVER_SECRET_KEY: Joi.string().min(32)
    .default('dev-ai-server-secret-key-change-in-production-min-32-chars'),
});
