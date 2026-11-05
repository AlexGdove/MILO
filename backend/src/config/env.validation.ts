import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Переменные окружения backend. Неверное значение — процесс не стартует. */
export class EnvironmentVariables {
  @IsIn(NODE_ENVS)
  NODE_ENV: NodeEnv = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsOptional()
  @IsIn(LOG_LEVELS)
  LOG_LEVEL?: LogLevel;

  @IsString()
  CORS_ORIGINS: string = 'http://localhost:5173';

  @IsOptional()
  @IsIn(['true', 'false'])
  SWAGGER_ENABLED?: 'true' | 'false';

  /** PostgreSQL: postgresql://user:password@host:port/db */
  @Matches(/^postgres(ql)?:\/\/\S+$/, { message: 'DATABASE_URL must be a postgresql:// URL' })
  DATABASE_URL!: string;
}

const ORIGIN_PATTERN = /^https?:\/\/[^\s/]+$/;

/** Разбирает список адресов через запятую; пустые элементы отбрасываются. */
export function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** Проверка для `ConfigModule.forRoot({ validate })`: возвращает типизированные значения. */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const problems = validateSync(env, { skipMissingProperties: false }).map(
    (error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
  );

  const badOrigins = parseOrigins(env.CORS_ORIGINS).filter(
    (origin) => !ORIGIN_PATTERN.test(origin),
  );
  if (badOrigins.length > 0) {
    problems.push(`CORS_ORIGINS: invalid origin(s) ${badOrigins.join(', ')}`);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid environment variables: ${problems.join('; ')}`);
  }
  return env;
}
