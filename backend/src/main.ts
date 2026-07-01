import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { Env } from './config/env.schema';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService<Env, true>);
  app.enableCors();
  setupSwagger(app);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}
void bootstrap();
