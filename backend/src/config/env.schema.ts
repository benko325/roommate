import { z } from 'zod';

/**
 * Schema for all environment variables the backend depends on.
 * Validated once at startup so a misconfigured environment fails fast
 * instead of surfacing as a runtime error later.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // PostgreSQL connection string used by Prisma.
  DATABASE_URL: z.string().url(),

  // JWT signing secret and access-token lifetime.
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
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
