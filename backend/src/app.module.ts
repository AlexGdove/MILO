import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { buildLoggerOptions } from './common/logging/logger.options.js';
import { createValidationPipe } from './common/validation/validation.pipe.js';
import { getAppConfig } from './config/app-config.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { DeviceKeysModule } from './modules/device-keys/device-keys.module.js';
import { ModerationModule } from './modules/moderation/moderation.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      // В тестах локальный .env разработчика не влияет на результат
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildLoggerOptions(getAppConfig(config)),
    }),
    PrismaModule,
    RedisModule,
    RateLimitModule,
    HealthModule,
    DeviceKeysModule,
    ProductsModule,
    ModerationModule,
  ],
  providers: [
    { provide: APP_PIPE, useFactory: createValidationPipe },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
