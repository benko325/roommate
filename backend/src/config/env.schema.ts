import { z } from 'zod';

/**
 * Schema for all environment variables the backend depends on.
 * Validated once at startup so a misconfigured environment fails fast
 * instead of surfacing as a runtime error later.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // PostgreSQL connection string used by Prisma.
  DATABASE_URL: z.string().url(),

  // JWT signing secret and access-token lifetime.
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),

  // Refresh-token lifetime, in days.
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Password-reset link lifetime, in minutes.
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  // Frontend origin, used to build invitation links.
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // SMTP (optional). Without SMTP_HOST, emails are logged instead of sent.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('RoomMate <no-reply@roommate.dev>'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * ConfigModule `validate` hook: parses `process.env` against the schema and
 * returns the typed, coerced values. Throws with a readable message on failure.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
