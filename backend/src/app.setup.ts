import type { NestApplicationOptions } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { ErrorResponseDto } from './common/errors/error-response.dto.js';
import { REQUEST_ID_HEADER, requestIdMiddleware } from './common/logging/logger.options.js';
import { type AppConfig, getAppConfig } from './config/app-config.js';

export const API_PREFIX = 'api/v1';
export const BODY_LIMIT = '64kb';

/** Общие опции создания приложения — и для `main.ts`, и для e2e-тестов. */
export const APP_OPTIONS: NestApplicationOptions = { bufferLogs: true, bodyParser: false };

/** Настройка HTTP-уровня: одинакова в рабочем запуске и в e2e-тестах. */
export function configureApp(app: NestExpressApplication): AppConfig {
  const config = getAppConfig(app.get(ConfigService));

  app.useLogger(app.get(Logger));
  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.useBodyParser('json', { limit: BODY_LIMIT });
  // CSP мешает Swagger UI; там, где UI включён (не production), CSP не ставим
  app.use(helmet({ contentSecurityPolicy: config.swaggerEnabled ? false : undefined }));
  app.enableCors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Device-Key', 'Idempotency-Key', REQUEST_ID_HEADER],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
  });
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();

  if (config.swaggerEnabled) {
    const document = new DocumentBuilder()
      .setTitle('MILO API')
      .setDescription('Публичные рецепты и поддержка. Контракты — docs/backend/api.md')
      .setVersion('1')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Device-Key' }, 'device-key')
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      () => SwaggerModule.createDocument(app, document, { extraModels: [ErrorResponseDto] }),
      { jsonDocumentUrl: 'api/docs-json' },
    );
  }

  return config;
}
