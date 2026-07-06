import { testDatabaseUrl } from './test-db';

// Runs (via jest setupFiles) before any application code is imported, so both
// PrismaClient and Nest's ConfigModule see the test values — process.env
// takes precedence over `.env`.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.JWT_SECRET ??= 'e2e-only-secret-not-for-production';
