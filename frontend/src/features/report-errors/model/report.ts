/** Вид ошибки — как в `POST /client-errors` (`docs/backend/api.md`). */
export type ErrorKind = 'error' | 'unhandledrejection' | 'render';
export type ErrorPlatform = 'web' | 'android' | 'ios';

export interface ErrorReport {
  kind: ErrorKind;
  message: string;
  stack?: string;
  platform: ErrorPlatform;
  appVersion: string;
  route?: string;
  userAgent?: string;
}

export interface ReportContext {
  platform: ErrorPlatform;
  appVersion: string;
  /** Путь страницы (`location.pathname`) */
  route: string;
  userAgent: string;
}

const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_ROUTE = 200;
const MAX_USER_AGENT = 300;

/** Адреса в тексте — без параметров и фрагмента: в них могут оказаться чужие данные. */
const URL_WITH_QUERY = /(https?:\/\/[^\s?#)'"]+)[?#][^\s)'"]*/g;

/** Убирает параметры адресов и обрезает текст до лимита сервера. */
export function scrub(text: string, limit: number): string {
  return text.replace(URL_WITH_QUERY, '$1').slice(0, limit);
}

/** Текст и стек из того, что бросили: ошибка, строка или что угодно. */
export function describeError(reason: unknown): { message: string; stack?: string } {
  if (reason instanceof Error) {
    return {
      message: reason.message || reason.name || 'Error',
      ...(reason.stack ? { stack: reason.stack } : {}),
    };
  }
  if (typeof reason === 'string' && reason) return { message: reason };
  try {
    return { message: JSON.stringify(reason) ?? String(reason) };
  } catch {
    return { message: String(reason) };
  }
}

/**
 * Отчёт для сервера: только технические данные — текст, стек, версия, платформа, страница без
 * параметров и браузер. Содержимого приложения (продукты, дневник, рецепты) в нём нет.
 */
export function buildReport(kind: ErrorKind, reason: unknown, context: ReportContext): ErrorReport {
  const { message, stack } = describeError(reason);
  return {
    kind,
    message: scrub(message, MAX_MESSAGE) || 'Error',
    ...(stack ? { stack: scrub(stack, MAX_STACK) } : {}),
    platform: context.platform,
    appVersion: context.appVersion,
    route: context.route.split(/[?#]/)[0]?.slice(0, MAX_ROUTE) || '/',
    userAgent: context.userAgent.slice(0, MAX_USER_AGENT),
  };
}

/**
 * Шум, о котором сообщать бесполезно: безобидная ошибка ResizeObserver и ошибки чужих скриптов
 * (расширения браузера, их текст — просто «Script error.»).
 */
export function isNoise(message: string): boolean {
  return /ResizeObserver loop|^Script error\.?$/i.test(message);
}
