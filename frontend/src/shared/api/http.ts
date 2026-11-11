import { isAbort, REQUEST_TIMEOUT_MS, withTimeout } from './timeout';

/**
 * HTTP-клиент backend MILO (`docs/backend/api.md`). Адрес — `VITE_API_URL`; без него в
 * разработке — `/api/v1` через прокси Vite на `localhost:3000`. Не задан — сервер не
 * подключён: экраны, которым он нужен, показывают это, остальное приложение работает.
 */

/** В `vite` (режим development) API — через прокси на `localhost:3000` (`vite.config.ts`). */
const DEV_API_URL = '/api/v1';

/** Базовый адрес API без завершающего `/`; читается при каждом вызове (тесты подменяют env). */
export const apiUrl = (): string =>
  (
    import.meta.env.VITE_API_URL ?? (import.meta.env.MODE === 'development' ? DEV_API_URL : '')
  ).replace(/\/+$/, '');

export const isApiEnabled = (): boolean => apiUrl().length > 0;

/**
 * Адрес сервера для Socket.IO: origin из абсолютного `VITE_API_URL`
 * (`https://api.milo.app/api/v1` → `https://api.milo.app`), для относительного — текущий сайт.
 */
export const socketOrigin = (): string => {
  const url = apiUrl();
  return /^https?:\/\//.test(url) ? new URL(url).origin : window.location.origin;
};

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/** Ошибка API: `code` — машинный код из контракта (`device_key_invalid`, `rate_limited`, …). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Сервер недоступен (нет сети, не запущен) — отдельно от ошибок ответа. */
export const NETWORK_ERROR = 'network_error';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  deviceKey?: string;
  /** Токен сессии аккаунта → `Authorization: Bearer` (решение №69) */
  authToken?: string;
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Сколько ждать ответа целиком (по умолчанию `REQUEST_TIMEOUT_MS`) */
  timeoutMs?: number;
}

/**
 * Запрос к API: JSON в обе стороны, ошибки — `ApiError` с кодом. `204` → `undefined`.
 * На медленной сети запрос не висит бесконечно: после тайм-аута — `network_error`.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!isApiEnabled()) {
    throw new ApiError(0, 'api_disabled', 'VITE_API_URL is not set');
  }
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) params.set(name, String(value));
  }
  // Не `params.size`: его нет в Safari < 17 и Chrome < 113 — параметры терялись бы
  const query = params.toString();
  const search = query ? `?${query}` : '';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.deviceKey) headers['X-Device-Key'] = options.deviceKey;
  if (options.authToken) headers.Authorization = `Bearer ${options.authToken}`;
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  const timeout = withTimeout(options.signal, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  let response: Response;
  let payload: unknown = null;
  try {
    response = await fetch(`${apiUrl()}${path}${search}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: timeout.signal,
    });
    if (response.status === 204) return undefined as T;
    payload = await response.json().catch((error: unknown) => {
      // Тело не дочиталось из-за тайм-аута или отмены — это не «пустой ответ»
      if (isAbort(error)) throw error;
      return null;
    });
  } catch (error) {
    if (timeout.timedOut()) throw new ApiError(0, NETWORK_ERROR, 'Request timed out');
    if (isAbort(error)) throw error;
    throw new ApiError(0, NETWORK_ERROR, 'Server is unreachable');
  } finally {
    timeout.done();
  }
  if (!response.ok) {
    const error = (
      payload as { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } } | null
    )?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'http_error',
      error?.message ?? response.statusText,
      error?.details ?? [],
    );
  }
  return payload as T;
}
