import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { testDatabaseUrl } from './test-db';

/** Creates (if needed) and migrates the test database before the e2e run. */
export default function globalSetup(): void {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'inherit',
  });
}
