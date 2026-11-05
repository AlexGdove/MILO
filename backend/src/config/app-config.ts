import type { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables, LogLevel, NodeEnv } from './env.validation.js';
import { parseOrigins } from './env.validation.js';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  logLevel: LogLevel;
  corsOrigins: string[];
  swaggerEnabled: boolean;
}

/** Итоговые настройки с вычисленными значениями по умолчанию. */
export function toAppConfig(env: Omit<EnvironmentVariables, 'DATABASE_URL'>): AppConfig {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    // В тестах логи по умолчанию выключены, чтобы не засорять вывод
    logLevel: env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
    corsOrigins: parseOrigins(env.CORS_ORIGINS),
    swaggerEnabled:
      env.SWAGGER_ENABLED === undefined
        ? env.NODE_ENV !== 'production'
        : env.SWAGGER_ENABLED === 'true',
  };
}

export function getAppConfig(config: ConfigService): AppConfig {
  return toAppConfig({
    NODE_ENV: config.getOrThrow('NODE_ENV'),
    PORT: config.getOrThrow('PORT'),
    LOG_LEVEL: config.get('LOG_LEVEL'),
    CORS_ORIGINS: config.getOrThrow('CORS_ORIGINS'),
    SWAGGER_ENABLED: config.get('SWAGGER_ENABLED'),
  });
}
