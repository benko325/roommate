import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService<Env, true>);
  // Allow the deployed frontend plus local dev; FRONTEND_URL defaults to
  // http://localhost:5173, so out of the box this behaves like before.
  app.enableCors({
    origin: [config.get('FRONTEND_URL', { infer: true }), 'http://localhost:5173'],
  });
  setupSwagger(app);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}
void bootstrap();
