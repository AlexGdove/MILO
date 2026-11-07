/** Сколько ждать ответа сервера: на 2G страница открывается за 5–10 с, дольше — нет связи. */
export const REQUEST_TIMEOUT_MS = 15_000;

export const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

/**
 * Сигнал отмены с тайм-аутом поверх внешнего (например, от TanStack Query). Без
 * `AbortSignal.any` / `AbortSignal.timeout` — их нет в старых браузерах слабых телефонов.
 * `done()` — обязательно после запроса: снимает таймер и подписку.
 */
export function withTimeout(outer: AbortSignal | undefined, ms: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  const forward = () => controller.abort();
  if (outer?.aborted) controller.abort();
  else outer?.addEventListener('abort', forward, { once: true });
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    done: () => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', forward);
    },
  };
}
