import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

/** Build the OpenAPI document for the app (shared by the server and codegen). */
export function buildOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('RoomMate API')
    .setDescription('Shared-housing room reservation API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  // cleanupOpenApiDoc resolves the zod-derived schemas emitted by nestjs-zod DTOs.
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}

/** Mount Swagger UI at /docs (JSON at /docs-json). */
export function setupSwagger(app: INestApplication) {
  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document);
}
