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

/** Токен бота: `<id бота>:<секрет>` (значение в сообщения об ошибке не попадает). */
const BOT_TOKEN_PATTERN = /^\d{5,15}:[A-Za-z0-9_-]{30,64}$/;
/** Чат Telegram: целое число, у групп — отрицательное. */
const CHAT_ID_PATTERN = /^-?\d{1,16}$/;
/** Тема в группе с темами: положительное целое. */
const THREAD_ID_PATTERN = /^[1-9]\d{0,9}$/;

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

  /** Redis для счётчиков лимитов: redis://[:password@]host:port[/db] */
  @Matches(/^rediss?:\/\/\S+$/, { message: 'REDIS_URL must be a redis:// or rediss:// URL' })
  REDIS_URL!: string;

  /**
   * Сколько прокси (nginx, балансировщик) стоит перед сервером: Express берёт IP клиента из
   * `X-Forwarded-For` только через столько звеньев. 0 — прокси нет, заголовок не учитывается
   * (иначе клиент подделает IP и обойдёт лимиты).
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  TRUST_PROXY: number = 0;

  /**
   * Служебные маршруты для локальной разработки (`/api/v1/dev/...`, например ответ «как
   * оператор» без Telegram-бота). Только вне production — иначе процесс не стартует.
   */
  @IsOptional()
  @IsIn(['true', 'false'])
  DEV_TOOLS?: 'true' | 'false';

  /**
   * Telegram-боты (этап 9, B-18): токен от @BotFather и чат операторов (группа). Без токена бот
   * не запускается; без чата бот отвечает только на `/id` — так узнают номер чата.
   */
  @IsOptional()
  @Matches(BOT_TOKEN_PATTERN, { message: 'TELEGRAM_SUPPORT_BOT_TOKEN must be a bot token' })
  TELEGRAM_SUPPORT_BOT_TOKEN?: string;

  @IsOptional()
  @Matches(CHAT_ID_PATTERN, { message: 'TELEGRAM_SUPPORT_CHAT_ID must be a chat id' })
  TELEGRAM_SUPPORT_CHAT_ID?: string;

  /** Тема группы для бота (одна группа с темами для обоих ботов, B-23); без неё — весь чат */
  @IsOptional()
  @Matches(THREAD_ID_PATTERN, { message: 'TELEGRAM_SUPPORT_THREAD_ID must be a topic id' })
  TELEGRAM_SUPPORT_THREAD_ID?: string;

  @IsOptional()
  @Matches(BOT_TOKEN_PATTERN, { message: 'TELEGRAM_MODERATION_BOT_TOKEN must be a bot token' })
  TELEGRAM_MODERATION_BOT_TOKEN?: string;

  @IsOptional()
  @Matches(CHAT_ID_PATTERN, { message: 'TELEGRAM_MODERATION_CHAT_ID must be a chat id' })
  TELEGRAM_MODERATION_CHAT_ID?: string;

  @IsOptional()
  @Matches(THREAD_ID_PATTERN, { message: 'TELEGRAM_MODERATION_THREAD_ID must be a topic id' })
  TELEGRAM_MODERATION_THREAD_ID?: string;
}

/** Служебные маршруты разработки включены (`DevToolsGuard` проверяет на каждом запросе). */
export function devToolsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEV_TOOLS === 'true' && env.NODE_ENV !== 'production';
}

/**
 * Адрес фронтенда: схема и хост без пути. Кроме http(s) — `capacitor://` (так WebView
 * iOS-приложения называет себя: `capacitor://localhost`; Android — `https://localhost`).
 */
const ORIGIN_PATTERN = /^(https?|capacitor):\/\/[^\s/]+$/;

/** Разбирает список адресов через запятую; пустые элементы отбрасываются. */
export function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/** Проверка для `ConfigModule.forRoot({ validate })`: возвращает типизированные значения. */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  // Пустое значение (`KEY=` в .env или `${KEY:-}` в compose) — то же, что не задано
  const present = Object.fromEntries(Object.entries(config).filter(([, value]) => value !== ''));
  const env = plainToInstance(EnvironmentVariables, present, {
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

  if (env.NODE_ENV === 'production' && env.DEV_TOOLS === 'true') {
    problems.push('DEV_TOOLS: development tools must not be enabled in production');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid environment variables: ${problems.join('; ')}`);
  }
  return env;
}
