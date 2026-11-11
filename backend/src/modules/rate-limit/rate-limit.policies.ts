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
 * Поддержка — на этом же сервере (B-18).
 */
export const RATE_LIMIT_POLICIES = {
  [GLOBAL_RATE_LIMIT]: { limit: 600, ttl: MINUTE, tracker: 'ip' },
  deviceKeyIssue: { limit: 5, ttl: HOUR, tracker: 'ip' },
  deviceDataDelete: { limit: 10, ttl: HOUR, tracker: 'device' },
  catalogRead: { limit: 120, ttl: MINUTE, tracker: 'ip' },
  productSubmit: { limit: 20, ttl: DAY, tracker: 'device' },
  ticketCreate: { limit: 5, ttl: DAY, tracker: 'device' },
  ticketMessage: { limit: 30, ttl: 10 * MINUTE, tracker: 'device' },
  supportRead: { limit: 120, ttl: MINUTE, tracker: 'device' },
  /** Отчёты об ошибках приложения: с одного устройства не больше 30 в час */
  clientError: { limit: 30, ttl: HOUR, tracker: 'device' },
  /** Запрос кода входа: с одного IP не больше 10 в час (ещё лимит на почту — в `AuthService`) */
  authStart: { limit: 10, ttl: HOUR, tracker: 'ip' },
  /** Ввод кода: с одного IP не больше 30 попыток за 10 минут (и 5 на сам код) */
  authVerify: { limit: 30, ttl: 10 * MINUTE, tracker: 'ip' },
  /** Аккаунт: чтение, выход, удаление */
  account: { limit: 120, ttl: MINUTE, tracker: 'ip' },
  /** Подключения к WebSocket `/support` — считает `SupportGateway`, не HTTP-guard */
  supportConnect: { limit: 30, ttl: MINUTE, tracker: 'ip' },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitPolicyName = Exclude<
  keyof typeof RATE_LIMIT_POLICIES,
  typeof GLOBAL_RATE_LIMIT
>;
