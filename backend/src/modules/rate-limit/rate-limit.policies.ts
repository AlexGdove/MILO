const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** По чему считается лимит: IP клиента или ключ устройства из `X-Device-Key`. */
export type RateLimitTracker = 'ip' | 'device';

export interface RateLimitPolicy {
  /** Сколько запросов разрешено за окно */
  limit: number;
  /** Длина скользящего окна, мс */
  ttl: number;
  tracker: RateLimitTracker;
}

/** Общий лимит: действует на каждый запрос (кроме `/health`). */
export const GLOBAL_RATE_LIMIT = 'all';

/**
 * Лимиты из `docs/backend/architecture.md` §5. Действие подключается к маршруту декоратором
 * `@RateLimit(name)`; один счётчик на действие, общий для всех его маршрутов.
 * Лимиты поддержки — в отдельном сервисе `support/` (B-15).
 */
export const RATE_LIMIT_POLICIES = {
  [GLOBAL_RATE_LIMIT]: { limit: 600, ttl: MINUTE, tracker: 'ip' },
  deviceKeyIssue: { limit: 5, ttl: HOUR, tracker: 'ip' },
  catalogRead: { limit: 120, ttl: MINUTE, tracker: 'ip' },
  recipePublish: { limit: 10, ttl: DAY, tracker: 'device' },
  recipeWrite: { limit: 60, ttl: HOUR, tracker: 'device' },
  recipeReport: { limit: 20, ttl: DAY, tracker: 'device' },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = Exclude<
  keyof typeof RATE_LIMIT_POLICIES,
  typeof GLOBAL_RATE_LIMIT
>;
