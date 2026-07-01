import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './swagger';

/**
 * Emits openapi.json without starting the HTTP server, so the frontend's
 * Kubb generator can produce typed hooks offline. Run: `pnpm openapi:generate`.
 */
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const document = buildOpenApiDocument(app);
  writeFileSync('openapi.json', `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  // biome-ignore lint/suspicious/noConsole: CLI script feedback
  console.log('Wrote backend/openapi.json');
}

void main();
